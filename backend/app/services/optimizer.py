"""
Optimization Engine — Deterministic Grid Search
================================================
METHODOLOGY:
  1. Generate all candidate configurations from parameter ranges.
  2. For each candidate, run the full thermal simulation.
  3. Apply FEASIBILITY filter: discard candidates where comfort % < threshold.
  4. For feasible candidates, normalize each metric to 0–100.
  5. Compute weighted final score.
  6. Rank by final score (descending).
  7. Return ALL candidates with feasibility status, metrics, and scores.

ASSUMPTIONS:
  - All simulations use identical climate data fetched once and cached.
  - Parallel execution uses ProcessPoolExecutor for CPU-bound simulation loops.
  - Normalization uses configurable reference ranges from optimization_config.py.
  - The explicit-Euler MAX_DT clamp in thermal_engine.py is active; results
    for very-low-capacitance materials may be physically imprecise.
"""

import time
import itertools
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import List, Dict, Any, Optional

from app.config.optimization_config import (
    DEFAULT_WEIGHTS,
    FEASIBILITY_MIN_COMFORT_PERCENT,
    NORM_RANGES,
)
from app.services.thermal_engine import run_thermal_simulation
from app.services.comfort_engine import calculate_comfort_score, summarize_simulation_results
from app.services.geometry_engine import calculate_geometry
from app.data.materials import get_all_materials, get_material_by_id


def _clamp_normalize(value: float, lo: float, hi: float, invert: bool = False) -> float:
    """Min-max normalize to 0–100. Optionally invert (lower raw = higher score)."""
    if hi == lo:
        return 50.0
    norm = (value - lo) / (hi - lo)
    norm = max(0.0, min(1.0, norm))
    if invert:
        norm = 1.0 - norm
    return round(norm * 100, 2)


def _run_single_candidate(args: Dict) -> Dict:
    """
    Run one candidate configuration through simulation.
    Designed to be called in a subprocess (ProcessPoolExecutor).
    Returns the full result dict including metrics and feasibility.
    """
    candidate_id = args["candidate_id"]
    geometry_params = args["geometry_params"]
    material = args["material"]
    climate = args["climate"]
    operating_conditions = args["operating_conditions"]
    simulation_params = args["simulation_params"]
    comfort_config = args["comfort_config"]

    try:
        # 1. Calculate geometry
        geometry = calculate_geometry(
            length=geometry_params["length"],
            width=geometry_params["width"],
            height=geometry_params["height"],
            roof_pitch=geometry_params["roof_pitch"],
        )

        # 2. Run thermal simulation
        time_series = run_thermal_simulation(
            geometry=geometry,
            material=material,
            climate=climate,
            operating_conditions=operating_conditions,
            simulation_params=simulation_params,
        )

        if not time_series:
            return {"candidate_id": candidate_id, "feasible": False, "error": "Empty time series"}

        # 3. Summarize
        summary = summarize_simulation_results(time_series)
        comfort = calculate_comfort_score(
            time_series=time_series,
            target_temperature=comfort_config["target_temperature"],
            comfort_band=comfort_config["comfort_band"],
        )

        # 4. Feasibility check
        comfort_pct = comfort["percentage_time_in_comfort_range"]
        feasible = comfort_pct >= FEASIBILITY_MIN_COMFORT_PERCENT

        # 5. Energy metric: total conduction + ventilation loss (W·h over sim period)
        total_energy_loss = abs(summary["total_conduction_loss"]) + abs(summary["total_ventilation_loss"])

        # 6. Weight metric: wall + roof mass
        wall_area = geometry["wall_area"]
        roof_area = geometry["roof_area"]
        thickness = material["thickness"]
        density = material["density"]
        total_weight = (wall_area + roof_area) * thickness * density

        # 7. Cost metric: wall + roof area × cost_per_m2
        total_cost = (wall_area + roof_area) * material["cost_per_m2"]

        return {
            "candidate_id": candidate_id,
            "feasible": feasible,
            "geometry": geometry_params,
            "material_id": material["id"],
            "material_name": material["name"],
            "thermal_summary": summary,
            "comfort": comfort,
            "metrics": {
                "comfort_percentage": round(comfort_pct, 2),
                "comfort_score_raw": round(comfort["score"], 2),
                "energy_loss_wh": round(total_energy_loss, 2),
                "total_weight_kg": round(total_weight, 2),
                "total_cost_usd": round(total_cost, 2),
            },
            "time_series_length": len(time_series),
        }

    except Exception as e:
        return {"candidate_id": candidate_id, "feasible": False, "error": str(e)}


def run_optimization(
    base_geometry: Dict,
    location: Dict,
    climate: Dict,
    operating_conditions: Dict,
    simulation_params: Dict,
    comfort_config: Dict,
    param_ranges: Dict,
    weights: Optional[Dict[str, float]] = None,
    max_workers: int = 4,
) -> Dict:
    """
    Main optimization entry point.

    param_ranges example:
    {
        "material_ids": [1, 2, 3],
        "thicknesses": [0.05, 0.10, 0.15],   # overrides material.thickness
        "roof_pitches": [5, 15, 30],
    }
    """
    start_time = time.time()

    # Merge weights with defaults
    effective_weights = {**DEFAULT_WEIGHTS, **(weights or {})}
    total_w = sum(effective_weights.values())
    norm_weights = {k: v / total_w for k, v in effective_weights.items()}

    # Build candidate list
    material_ids = param_ranges.get("material_ids", [m["id"] for m in get_all_materials()])
    thicknesses = param_ranges.get("thicknesses", [None])  # None = use material default
    roof_pitches = param_ranges.get("roof_pitches", [base_geometry.get("roof_pitch", 15)])

    candidates = []
    cid = 0
    for mat_id, thickness_override, roof_pitch in itertools.product(material_ids, thicknesses, roof_pitches):
        mat = get_material_by_id(mat_id)
        if mat is None:
            continue
        mat_copy = dict(mat)
        if thickness_override is not None:
            mat_copy["thickness"] = thickness_override

        geo_params = {**base_geometry, "roof_pitch": roof_pitch}

        candidates.append({
            "candidate_id": cid,
            "geometry_params": geo_params,
            "material": mat_copy,
            "climate": climate,
            "operating_conditions": operating_conditions,
            "simulation_params": simulation_params,
            "comfort_config": comfort_config,
        })
        cid += 1

    # Run simulations (thread pool - ProcessPool has pickling issues on Windows with pydantic)
    raw_results = []
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_run_single_candidate, c): c["candidate_id"] for c in candidates}
        for future in as_completed(futures):
            raw_results.append(future.result())

    # Sort by candidate_id to ensure deterministic order before normalization
    raw_results.sort(key=lambda r: r["candidate_id"])

    # Separate feasible from infeasible
    feasible = [r for r in raw_results if r.get("feasible") and "error" not in r]
    infeasible = [r for r in raw_results if not r.get("feasible") or "error" in r]

    # Normalize metrics across feasible candidates only
    if feasible:
        # Use config ranges for normalization (not just candidate min/max,
        # to keep scores comparable across different optimization runs)
        for r in feasible:
            m = r["metrics"]
            r["normalized_scores"] = {
                "comfort": _clamp_normalize(m["comfort_percentage"], 0, 100, invert=False),
                "energy":  _clamp_normalize(m["energy_loss_wh"],
                                            NORM_RANGES["energy_loss_min"],
                                            NORM_RANGES["energy_loss_max"], invert=True),
                "weight":  _clamp_normalize(m["total_weight_kg"],
                                            NORM_RANGES["weight_min"],
                                            NORM_RANGES["weight_max"], invert=True),
                "cost":    _clamp_normalize(m["total_cost_usd"],
                                            NORM_RANGES["cost_min"],
                                            NORM_RANGES["cost_max"], invert=True),
            }
            ns = r["normalized_scores"]
            r["final_score"] = round(
                sum(ns[k] * norm_weights[k] for k in norm_weights), 2
            )

        # Rank feasible candidates (best score = rank 1)
        feasible.sort(key=lambda r: r["final_score"], reverse=True)
        for rank, r in enumerate(feasible, start=1):
            r["rank"] = rank

    # Infeasible candidates get rank=None
    for r in infeasible:
        r["rank"] = None
        r["normalized_scores"] = {}
        r["final_score"] = None

    elapsed = round(time.time() - start_time, 2)

    return {
        "meta": {
            "total_candidates": len(raw_results),
            "feasible_count": len(feasible),
            "infeasible_count": len(infeasible),
            "runtime_seconds": elapsed,
            "feasibility_threshold_pct": FEASIBILITY_MIN_COMFORT_PERCENT,
            "weights_used": effective_weights,
            "normalized_weights": {k: round(v, 4) for k, v in norm_weights.items()},
            "scoring_methodology": (
                "Feasibility is checked first (comfort % >= threshold). "
                "Each metric is min-max normalized to 0-100 using reference ranges "
                "from optimization_config.py. Final score = weighted sum of normalized scores."
            ),
        },
        "ranked_candidates": feasible + infeasible,
    }
