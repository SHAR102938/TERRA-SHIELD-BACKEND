"""
Deterministic parametric optimization for shelter design.

Implements:
  - Parametric sweep over insulation thickness, window ratios, roof types
  - Weighted composite scoring (energy, comfort, cost)
  - Pareto frontier extraction
  - Deterministic ranking — no ML/AI, fully traceable to metrics
"""

from __future__ import annotations

import itertools
from copy import deepcopy

from thermashell_engine.types import (
    SimulationConfig, OptimizationCandidate, ParetoFrontier, MaterialLayer
)
from thermashell_engine.rc_network import run_simulation


# ── Cost factors (relative, not absolute) ────────────────────────────────
INSULATION_COST_PER_MM = 0.5    # Relative cost per mm of added insulation
WINDOW_COST_FACTOR = 2.0        # Relative cost multiplier for better glazing
ROOF_INSULATION_FACTOR = 0.8    # Roof insulation slightly cheaper per mm


def generate_design_variants(
    base_config: SimulationConfig,
    insulation_thicknesses: list[float] | None = None,
    window_u_values: list[float] | None = None,
    ach_values: list[float] | None = None,
) -> list[tuple[str, SimulationConfig, dict]]:
    """
    Generate design variants by sweeping parameters around a base design.

    Args:
        base_config: Baseline simulation config
        insulation_thicknesses: Wall insulation thickness values in meters
        window_u_values: Window U-values to try
        ach_values: Natural ventilation ACH values to try

    Returns:
        List of (design_id, modified_config, changed_params) tuples
    """
    if insulation_thicknesses is None:
        insulation_thicknesses = [0.04, 0.06, 0.08, 0.10, 0.12, 0.15, 0.20]
    if window_u_values is None:
        window_u_values = [5.7, 3.5, 2.8, 1.8]  # Single → Double → Low-E → Triple
    if ach_values is None:
        ach_values = [0.3, 0.5, 0.8]

    variants = []
    variant_id = 0

    for ins_t, win_u, ach in itertools.product(
        insulation_thicknesses, window_u_values, ach_values
    ):
        cfg = deepcopy(base_config)

        # Modify wall insulation thickness
        # Find or add insulation layer (assume last interior layer)
        insulation_found = False
        for layer in cfg.envelope.walls.layers:
            if "insulation" in layer.name.lower() or layer.conductivity < 0.05:
                layer.thickness_m = ins_t
                insulation_found = True
                break

        if not insulation_found and len(cfg.envelope.walls.layers) > 0:
            # Add insulation layer
            cfg.envelope.walls.layers.append(MaterialLayer(
                name="EPS Insulation",
                thickness_m=ins_t,
                conductivity=0.035,
                density=25,
                specific_heat=1400,
            ))

        # Modify roof insulation similarly
        for layer in cfg.envelope.roof.layers:
            if "insulation" in layer.name.lower() or layer.conductivity < 0.05:
                layer.thickness_m = ins_t * 1.2  # Roof gets 20% more
                break

        # Modify window U-values
        for opening in cfg.envelope.openings:
            opening.u_value = win_u

        # Modify ventilation
        cfg.ach_natural = ach

        params = {
            "insulation_mm": round(ins_t * 1000),
            "window_u_value": win_u,
            "ach_natural": ach,
        }

        design_id = f"D{variant_id:03d}_ins{round(ins_t*1000)}mm_U{win_u}_ach{ach}"
        variants.append((design_id, cfg, params))
        variant_id += 1

    return variants


def compute_cost_factor(params: dict) -> float:
    """
    Compute relative cost factor for a design variant.

    Higher insulation, better windows, tighter construction → higher cost.
    Returns a normalized factor (1.0 = baseline cost).
    """
    ins_mm = params.get("insulation_mm", 80)
    win_u = params.get("window_u_value", 5.7)
    ach = params.get("ach_natural", 0.5)

    ins_cost = 1.0 + (ins_mm - 80) * INSULATION_COST_PER_MM / 100.0
    win_cost = 1.0 + (5.7 - win_u) * WINDOW_COST_FACTOR / 5.7
    ach_cost = 1.0 + max(0, 0.5 - ach) * 0.5  # Tighter = more expensive

    return round(ins_cost * win_cost * ach_cost, 3)


def evaluate_candidate(
    design_id: str,
    config: SimulationConfig,
    params: dict
) -> OptimizationCandidate:
    """
    Run simulation for a design variant and return evaluation metrics.
    """
    result = run_simulation(config)

    # Total energy = heating + cooling energy
    energy = (result.heat_balance.heating_energy_kwh +
              result.heat_balance.cooling_energy_kwh)

    return OptimizationCandidate(
        design_id=design_id,
        parameters=params,
        energy_kwh=round(energy, 3),
        comfort_percentage=result.comfort.comfort_percentage,
        estimated_cost_factor=compute_cost_factor(params),
        score=0.0,  # Computed after all candidates evaluated
        is_pareto_optimal=False,
    )


def extract_pareto_frontier(candidates: list[OptimizationCandidate]) -> list[OptimizationCandidate]:
    """
    Extract Pareto-optimal candidates (minimize energy, maximize comfort, minimize cost).

    A candidate is Pareto-optimal if no other candidate is strictly better in all objectives.
    """
    pareto = []

    for c in candidates:
        is_dominated = False
        for other in candidates:
            if other.design_id == c.design_id:
                continue
            # Other dominates c if: less energy AND more comfort AND less cost
            if (other.energy_kwh <= c.energy_kwh and
                other.comfort_percentage >= c.comfort_percentage and
                other.estimated_cost_factor <= c.estimated_cost_factor and
                (other.energy_kwh < c.energy_kwh or
                 other.comfort_percentage > c.comfort_percentage or
                 other.estimated_cost_factor < c.estimated_cost_factor)):
                is_dominated = True
                break

        if not is_dominated:
            c.is_pareto_optimal = True
            pareto.append(c)

    return pareto


def score_candidates(
    candidates: list[OptimizationCandidate],
    w_energy: float = 0.4,
    w_comfort: float = 0.4,
    w_cost: float = 0.2
) -> list[OptimizationCandidate]:
    """
    Score candidates using weighted normalization.

    Lower energy is better, higher comfort is better, lower cost is better.
    """
    if not candidates:
        return candidates

    # Normalize to [0, 1]
    energies = [c.energy_kwh for c in candidates]
    comforts = [c.comfort_percentage for c in candidates]
    costs = [c.estimated_cost_factor for c in candidates]

    e_min, e_max = min(energies), max(energies)
    c_min, c_max = min(comforts), max(comforts)
    cost_min, cost_max = min(costs), max(costs)

    e_range = e_max - e_min if e_max > e_min else 1
    c_range = c_max - c_min if c_max > c_min else 1
    cost_range = cost_max - cost_min if cost_max > cost_min else 1

    for c in candidates:
        e_norm = 1.0 - (c.energy_kwh - e_min) / e_range  # Lower energy = higher score
        c_norm = (c.comfort_percentage - c_min) / c_range  # Higher comfort = higher score
        cost_norm = 1.0 - (c.estimated_cost_factor - cost_min) / cost_range  # Lower cost = higher score

        c.score = round(w_energy * e_norm + w_comfort * c_norm + w_cost * cost_norm, 4)

    candidates.sort(key=lambda x: x.score, reverse=True)
    return candidates


def run_optimization(
    base_config: SimulationConfig,
    insulation_thicknesses: list[float] | None = None,
    window_u_values: list[float] | None = None,
    ach_values: list[float] | None = None,
    w_energy: float = 0.4,
    w_comfort: float = 0.4,
    w_cost: float = 0.2,
    max_candidates: int = 50,
) -> ParetoFrontier:
    """
    Full optimization pipeline:
      1. Generate design variants
      2. Evaluate each via simulation
      3. Score and rank
      4. Extract Pareto frontier
      5. Select deterministic recommendation

    Args:
        base_config: Baseline design configuration
        insulation_thicknesses: Sweep values for insulation (meters)
        window_u_values: Sweep values for window U-value
        ach_values: Sweep values for ACH
        w_energy, w_comfort, w_cost: Scoring weights (must sum to 1)
        max_candidates: Maximum number of variants to evaluate

    Returns:
        ParetoFrontier with all candidates, Pareto-optimal set, and recommendation
    """
    variants = generate_design_variants(
        base_config, insulation_thicknesses, window_u_values, ach_values
    )

    # Limit candidates
    variants = variants[:max_candidates]

    candidates = []
    for design_id, cfg, params in variants:
        try:
            candidate = evaluate_candidate(design_id, cfg, params)
            candidates.append(candidate)
        except Exception:
            continue  # Skip failed simulations

    # Score and rank
    candidates = score_candidates(candidates, w_energy, w_comfort, w_cost)

    # Extract Pareto frontier
    pareto = extract_pareto_frontier(candidates)

    # Recommendation: highest-scoring Pareto-optimal candidate
    recommended = None
    reason = ""
    if pareto:
        pareto_scored = sorted(pareto, key=lambda x: x.score, reverse=True)
        recommended = pareto_scored[0]

        # Generate deterministic reason
        if candidates:
            baseline = candidates[-1]  # Lowest scoring as "baseline"
            energy_delta = round(baseline.energy_kwh - recommended.energy_kwh, 1)
            comfort_delta = round(recommended.comfort_percentage - baseline.comfort_percentage, 1)
            reason = (
                f"Recommended: {recommended.design_id} — "
                f"{energy_delta} kWh less energy ({round(energy_delta/max(baseline.energy_kwh,0.01)*100,1)}% reduction), "
                f"{comfort_delta}% more comfort hours vs worst candidate. "
                f"Insulation: {recommended.parameters.get('insulation_mm', '?')}mm, "
                f"Window U-value: {recommended.parameters.get('window_u_value', '?')} W/(m²·K), "
                f"ACH: {recommended.parameters.get('ach_natural', '?')}."
            )

    return ParetoFrontier(
        candidates=candidates,
        pareto_optimal=pareto,
        recommended=recommended,
        recommendation_reason=reason,
        total_evaluated=len(candidates),
    )
