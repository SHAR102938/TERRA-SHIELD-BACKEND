from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.services.geometry_engine import calculate_geometry
from app.services.thermal_engine import run_thermal_simulation
from app.services.validation_engine import (
    calculate_analytical_reference,
    calculate_metrics,
    transient_rc_analytical_reference,
    derive_rc_params,
    calculate_transient_metrics,
)
from app.data.materials import get_material_by_id
from app.services.ansys_benchmark_service import (
    get_benchmark_repository,
    DatasetSource,
    DatasetStatus,
)
from app.services.ansys_validation_engine import (
    run_benchmark_validation,
    ValidationStatus,
)

router = APIRouter()


class ValidationRequest(BaseModel):
    case_id: str

# ─── Common geometry for all transient benchmarks ─────────────────────────────
# A simple box shelter: 5m × 4m × 3m, zero roof pitch to keep
# wall/roof area simple and geometry unambiguous.
_BENCH_GEO_PARAMS = {"length": 5.0, "width": 4.0, "height": 3.0, "roof_pitch": 0.0}

# Climate dict: zero amplitude → constant T_outdoor = 10 °C, no solar, no radiation
_BENCH_CLIMATE = {
    "temperature": 10.0,
    "solar_radiation": 0.0,
    "wind_speed": 2.0,
    "temperature_amplitude": 0.0,   # disables sinusoidal swing in production solver
}

# Baseline operating conditions shared across cases
_BENCH_OPS_BASE = {
    "target_temperature": 20.0,
    "occupants": 0,
    "heat_per_person": 0,
    "air_changes_per_hour": 0.5,
}

def _run_transient_case(
    mat_id: int,
    thickness: float,
    T_initial: float,
    Q_internal: float,
    ach: float,
    duration_hours: float,
    timestep_hours: float,
    label: str,
):
    """
    Run one transient RC benchmark case.
    Returns a dict with production result, reference result, metrics, and RC params.
    """
    geometry = calculate_geometry(**_BENCH_GEO_PARAMS)
    material = dict(get_material_by_id(mat_id))
    material["thickness"]          = thickness
    material["emissivity"]         = 0.0   # exclude radiation
    material["solar_absorptivity"] = 0.0   # exclude solar

    operating = dict(_BENCH_OPS_BASE)
    operating["initial_indoor_temperature"] = T_initial
    operating["heat_per_person"]            = Q_internal   # passed as W direct; occupants = 1
    operating["occupants"]                  = 1
    operating["air_changes_per_hour"]       = ach

    sim_params = {"duration_hours": duration_hours, "timestep_hours": timestep_hours}

    # ── Derive RC parameters (same formula as thermal_engine.py, no production call) ──
    rc = derive_rc_params(geometry, material, _BENCH_CLIMATE, operating)
    R_eff = rc["R_eff"]
    C_air = rc["C_air"]

    # ── Analytical reference (independent of production solver) ──
    ref = transient_rc_analytical_reference(
        T_initial=T_initial,
        T_outdoor=_BENCH_CLIMATE["temperature"],
        Q_internal=Q_internal,
        R_eff=R_eff,
        C_air=C_air,
        duration_hours=duration_hours,
        timestep_hours=timestep_hours,
    )

    # ── Production solver ──
    try:
        prod_ts_raw = run_thermal_simulation(geometry, material, _BENCH_CLIMATE, operating, sim_params)
        prod_temps = [p["indoor_temperature"] for p in prod_ts_raw]
        error_msg = None
    except Exception as e:
        return {
            "label": label,
            "status": "FAILED",
            "error": str(e),
            "limitations": ["Production solver raised an exception for this case."],
            "rc_params": rc,
            "ref": ref,
        }

    # ── Metrics ──
    # Align lengths (production may differ by 1 if rounding differs)
    n = min(len(prod_temps), len(ref["time_series"]))
    metrics = calculate_transient_metrics(prod_temps[:n], ref["time_series"][:n])

    return {
        "label": label,
        "rc_params": {
            "R_eff_KperW":   round(R_eff, 6),
            "C_air_JperK":   round(C_air, 2),
            "tau_seconds":   ref["tau_seconds"],
            "tau_hours":     ref["tau_hours"],
            "T_ss":          ref["T_ss"],
            "UA_shell_WperK": round(rc["UA_shell"], 4),
            "UA_vent_WperK":  round(rc["UA_vent"],  4),
        },
        "production_result": {"time_series": prod_temps},
        "reference_result":  {"time_series": ref["time_series"], "T_ss": ref["T_ss"]},
        "comparison": metrics,
        "status": "REVIEW",   # No validated PASS threshold yet
        "limitations": [
            "1st-order model ignores wall/roof thermal mass.",
            "Radiation excluded (emissivity = 0).",
            "Solar gain excluded (solar_absorptivity = 0).",
            "Constant outdoor temperature (temperature_amplitude = 0).",
            "ANSYS validation: planned, not yet performed.",
        ],
    }


@router.post("")
def run_validation(request: ValidationRequest) -> Dict[str, Any]:

    # ─── Case 1: existing steady-state benchmark ──────────────────────────────
    if request.case_id == "analytical_steady_state":
        geo_params = {"length": 5.0, "width": 4.0, "height": 3.0, "roof_pitch": 0.0}
        geometry = calculate_geometry(**geo_params)
        material = dict(get_material_by_id(1))
        material["emissivity"]         = 0.0
        material["solar_absorptivity"] = 0.0
        climate  = {"temperature": 10.0, "solar_radiation": 0.0, "wind_speed": 4.0}
        operating = {
            "target_temperature":         20.0,
            "initial_indoor_temperature": 15.0,
            "occupants":                  2,
            "heat_per_person":            100.0,
            "air_changes_per_hour":       0.5,
        }
        ref_result    = calculate_analytical_reference(geometry, material, climate, operating, 72)
        expected_temp = ref_result["expected_mean_temperature"]
        operating["initial_indoor_temperature"] = expected_temp
        sim_params = {"duration_hours": 72, "timestep_hours": 1.0}
        prod_ts    = run_thermal_simulation(geometry, material, climate, operating, sim_params)
        prod_temps = [t["indoor_temperature"] for t in prod_ts]
        prod_mean  = sum(prod_temps) / len(prod_temps)
        ref_temps  = ref_result["time_series"]
        metrics    = calculate_metrics(prod_temps, ref_temps)
        status     = "PASS" if metrics["mae"] < 0.5 else "REVIEW"
        return {
            "case_id":          request.case_id,
            "description":      "Analytical steady-state energy balance ignoring solar and radiation.",
            "reference_source": "Analytical U-value heat balance equation",
            "production_result":{"mean_temperature": round(prod_mean, 4), "time_series": prod_temps},
            "reference_result": {"mean_temperature": expected_temp, "time_series": ref_temps},
            "comparison":       metrics,
            "status":           status,
            "limitations": [
                "Assumes zero emissivity and zero solar gain.",
                "Tests primarily the conduction and ventilation heat loss implementation.",
                "Actual dynamic transient response requires a dynamic reference (e.g., ANSYS).",
            ],
        }

    # ─── Cases 2-4: transient RC analytical benchmarks ────────────────────────
    #
    # Three cases with different RC time constants:
    #   A: Moderate tau  — thick insulation, moderate ACH
    #   B: Short tau     — thin insulation, high ventilation
    #   C: Long tau      — thick insulation, very low ventilation

    elif request.case_id == "transient_rc_A":
        # Case A — moderate time constant (~3-6 h)
        # Material: mat_id=1 (Insulated Fabric), thickness=0.15m, ACH=0.5
        result_1h  = _run_transient_case(1, 0.15, 30.0, 0.0, 0.5, 48, 1.0,  "Case A (1-hour output)")
        result_30m = _run_transient_case(1, 0.15, 30.0, 0.0, 0.5, 48, 0.5,  "Case A (30-min output)")
        convergence_diff = round(
            abs(result_1h["comparison"]["mae"] - result_30m["comparison"]["mae"]), 4
        ) if "comparison" in result_1h and "comparison" in result_30m else None
        return {
            "case_id": request.case_id,
            "description": "Transient RC benchmark Case A — moderate time constant. Hot room cooling to outdoor equilibrium.",
            "reference_source": "Independent analytical solution: T(t) = T_ss + (T0 - T_ss)*exp(-t/tau)",
            "rc_params":  result_1h.get("rc_params"),
            "result_1h_output":  result_1h,
            "result_30m_output": result_30m,
            "convergence": {
                "mae_1h":   result_1h.get("comparison", {}).get("mae"),
                "mae_30m":  result_30m.get("comparison", {}).get("mae"),
                "difference": convergence_diff,
            },
            "overall_status": "REVIEW",
            "limitations": result_1h.get("limitations"),
        }

    elif request.case_id == "transient_rc_B":
        # Case B — shorter time constant (~1-2 h)
        # Material: mat_id=3 (PU Foam), thin=0.05m, high ACH=2.0
        result_1h  = _run_transient_case(3, 0.05, 30.0, 0.0, 2.0, 24, 1.0,  "Case B (1-hour output)")
        result_30m = _run_transient_case(3, 0.05, 30.0, 0.0, 2.0, 24, 0.5,  "Case B (30-min output)")
        convergence_diff = round(
            abs(result_1h["comparison"]["mae"] - result_30m["comparison"]["mae"]), 4
        ) if "comparison" in result_1h and "comparison" in result_30m else None
        return {
            "case_id": request.case_id,
            "description": "Transient RC benchmark Case B — shorter time constant. High ventilation thin shell.",
            "reference_source": "Independent analytical solution: T(t) = T_ss + (T0 - T_ss)*exp(-t/tau)",
            "rc_params":  result_1h.get("rc_params"),
            "result_1h_output":  result_1h,
            "result_30m_output": result_30m,
            "convergence": {
                "mae_1h":   result_1h.get("comparison", {}).get("mae"),
                "mae_30m":  result_30m.get("comparison", {}).get("mae"),
                "difference": convergence_diff,
            },
            "overall_status": "REVIEW",
            "limitations": result_1h.get("limitations"),
        }

    elif request.case_id == "transient_rc_C":
        # Case C — longer time constant (~8-12 h)
        # Material: mat_id=4 (Rock Wool), thick=0.25m, very low ACH=0.2
        result_1h  = _run_transient_case(4, 0.25, 30.0, 0.0, 0.2, 72, 1.0,  "Case C (1-hour output)")
        result_30m = _run_transient_case(4, 0.25, 30.0, 0.0, 0.2, 72, 0.5,  "Case C (30-min output)")
        convergence_diff = round(
            abs(result_1h["comparison"]["mae"] - result_30m["comparison"]["mae"]), 4
        ) if "comparison" in result_1h and "comparison" in result_30m else None
        return {
            "case_id": request.case_id,
            "description": "Transient RC benchmark Case C — longer time constant. Thick insulation, minimal ventilation.",
            "reference_source": "Independent analytical solution: T(t) = T_ss + (T0 - T_ss)*exp(-t/tau)",
            "rc_params":  result_1h.get("rc_params"),
            "result_1h_output":  result_1h,
            "result_30m_output": result_30m,
            "convergence": {
                "mae_1h":   result_1h.get("comparison", {}).get("mae"),
                "mae_30m":  result_30m.get("comparison", {}).get("mae"),
                "difference": convergence_diff,
            },
            "overall_status": "REVIEW",
            "limitations": result_1h.get("limitations"),
        }

    # ─── Cases 5+: ANSYS benchmark repository datasets ──────────────────────
    repo = get_benchmark_repository()
    if request.case_id in repo.get_available_case_ids():
        ds = repo.get_benchmark(request.case_id)
        if not ds or ds.error:
            return {"error": f"Benchmark error for {request.case_id}: {ds.error if ds else 'Not found'}"}

        geo = calculate_geometry(
            length=ds.metadata.geometry["length_m"],
            width=ds.metadata.geometry["width_m"],
            height=ds.metadata.geometry["height_m"],
            roof_pitch=0.0,
        )
        mat = {
            "name": ds.metadata.display_name,
            "thermal_conductivity": ds.metadata.material["thermal_conductivity_WpmK"],
            "density": ds.metadata.material["density_kgpm3"],
            "specific_heat": ds.metadata.material["specific_heat_JpkgK"],
            "thickness": ds.metadata.material["thickness_m"],
            "solar_absorptivity": 0.0,
            "emissivity": 0.0,
            "cost_per_m2": 50.0,
            "weight_per_m2": 10.0,
        }
        clim = {
            "temperature": ds.metadata.boundary_conditions["outdoor_temperature_c"],
            "solar_radiation": 0.0,
            "wind_speed": ds.metadata.boundary_conditions.get("wind_speed_ms", 2.0),
            "temperature_amplitude": 0.0,
        }
        ops = {
            "target_temperature": 20.0,
            "initial_indoor_temperature": ds.metadata.initial_conditions["indoor_temperature_c"],
            "occupants": 0,
            "heat_per_person": 0.0,
            "air_changes_per_hour": ds.metadata.ventilation["air_changes_per_hour"],
        }
        dur_h = int(ds.metadata.simulation.get("duration_hours", 48))
        sim = {"duration_hours": dur_h, "timestep_hours": 1.0}

        prod_ts = run_thermal_simulation(geo, mat, clim, ops, sim)
        prod_times_s = [p["hour"] * 3600.0 for p in prod_ts]
        prod_temps = [p["indoor_temperature"] for p in prod_ts]

        val_res = run_benchmark_validation(
            case_id=request.case_id,
            thermashell_timestamps_s=prod_times_s,
            thermashell_temperatures_c=prod_temps,
            reference_timestamps_s=ds.timestamps_s,
            reference_temperatures_c=ds.temperatures_c,
            source=ds.source.value,
        )

        m = val_res.metrics
        return {
            "case_id": request.case_id,
            "description": ds.metadata.display_name,
            "reference_source": f"{ds.metadata.software} ({ds.source.value})",
            "production_result": {"time_series": val_res.thermashell_temperatures_c},
            "reference_result": {
                "time_series": val_res.reference_temperatures_c,
                "T_ss": ds.metadata.derived_rc_params.get("T_ss_c", clim["temperature"]),
            },
            "comparison": {
                "mae": m.mae_c if m else 0.0,
                "rmse": m.rmse_c if m else 0.0,
                "max_absolute_error": m.max_absolute_error_c if m else 0.0,
                "mean_temperature_difference": m.mean_bias_error_c if m else 0.0,
                "relative_error_percent": m.normalized_rmse_percent if (m and m.normalized_rmse_percent is not None) else 0.0,
                "final_temperature_error": round(abs(val_res.thermashell_temperatures_c[-1] - val_res.reference_temperatures_c[-1]), 4) if val_res.thermashell_temperatures_c else 0.0,
            },
            "advanced_metrics": {
                "pearson_r": m.pearson_r if m else None,
                "r_squared": m.r_squared if m else None,
                "normalized_rmse_percent": m.normalized_rmse_percent if m else None,
                "peak_temperature_error_c": m.peak_temperature_error_c if m else None,
            },
            "rc_params": {
                "R_eff_KperW": ds.metadata.derived_rc_params.get("R_eff_KperW", 0.0),
                "C_air_JperK": ds.metadata.derived_rc_params.get("C_air_JperK", 0.0),
                "tau_seconds": ds.metadata.derived_rc_params.get("tau_seconds", 0.0),
                "tau_hours": ds.metadata.derived_rc_params.get("tau_hours", 0.0),
                "T_ss": ds.metadata.derived_rc_params.get("T_ss_c", clim["temperature"]),
                "UA_shell_WperK": 0.0,
                "UA_vent_WperK": 0.0,
            },
            "status": val_res.status.value.upper(),
            "source_type": ds.source.value,
            "is_real_ansys": ds.source in (DatasetSource.ANSYS_FLUENT, DatasetSource.ANSYS_MECHANICAL),
            "provenance": ds.metadata.provenance,
            "limitations": [
                "Dataset source is TEST_FIXTURE (analytical RC solution), not real ANSYS FEA export." if ds.source == DatasetSource.TEST_FIXTURE else "Real ANSYS simulation comparison.",
                "Status is strictly marked as FIXTURE_ONLY — never claims verified without genuine ANSYS data." if ds.source == DatasetSource.TEST_FIXTURE else "ANSYS verification criteria applied.",
            ],
        }

    else:
        valid_cases = ["analytical_steady_state", "transient_rc_A", "transient_rc_B", "transient_rc_C"] + repo.get_available_case_ids()
        return {"error": f"Unknown case_id: {request.case_id!r}. Valid: {', '.join(valid_cases)}"}


@router.get("/benchmarks")
def list_benchmarks() -> Dict[str, Any]:
    """List all available validation benchmarks (analytical and ANSYS datasets)."""
    analytical_cases = [
        {
            "case_id": "analytical_steady_state",
            "display_name": "Analytical Steady-State Heat Balance",
            "source": "ANALYTICAL_REFERENCE",
            "status": "available",
            "type": "steady",
            "is_real_ansys": False,
            "description": "Steady-state heat loss balance against outdoor cold reservoir.",
        },
        {
            "case_id": "transient_rc_A",
            "display_name": "Transient RC — Case A (Moderate tau)",
            "source": "ANALYTICAL_REFERENCE",
            "status": "available",
            "type": "transient",
            "is_real_ansys": False,
            "description": "Transient 1st-order analytical cooling curve with moderate time constant.",
        },
        {
            "case_id": "transient_rc_B",
            "display_name": "Transient RC — Case B (Short tau)",
            "source": "ANALYTICAL_REFERENCE",
            "status": "available",
            "type": "transient",
            "is_real_ansys": False,
            "description": "Transient analytical cooling curve with high ventilation thin shell.",
        },
        {
            "case_id": "transient_rc_C",
            "display_name": "Transient RC — Case C (Long tau)",
            "source": "ANALYTICAL_REFERENCE",
            "status": "available",
            "type": "transient",
            "is_real_ansys": False,
            "description": "Transient analytical cooling curve with thick insulation.",
        },
    ]

    repo = get_benchmark_repository()
    ansys_cases = []
    for b in repo.list_benchmarks():
        ds = repo.get_benchmark(b["case_id"])
        ansys_cases.append({
            "case_id": b["case_id"],
            "display_name": b["display_name"],
            "source": b["source"],
            "status": b["status"],
            "type": "ansys",
            "is_real_ansys": ds.source in (DatasetSource.ANSYS_FLUENT, DatasetSource.ANSYS_MECHANICAL) if ds else False,
            "n_points": b["n_points"],
            "duration_hours": round(b["duration_s"] / 3600.0, 1),
            "description": ds.metadata.provenance.get("description", "") if ds else "",
        })

    return {
        "analytical": analytical_cases,
        "ansys": ansys_cases,
        "has_real_ansys_data": repo.has_real_ansys_data,
    }


@router.get("/ansys-status")
def get_ansys_status() -> Dict[str, Any]:
    """Return explicit provenance and readiness status of the ANSYS validation subsystem."""
    repo = get_benchmark_repository()
    return {
        "ansys_integrated": True,
        "has_real_ansys_data": repo.has_real_ansys_data,
        "datasets_available": repo.list_benchmarks(),
        "status_notice": (
            "Genuine ANSYS FEA/CFD data loaded and ready for formal verification."
            if repo.has_real_ansys_data
            else "Currently using traceable analytical RC test fixtures. Real ANSYS Fluent / Mechanical exports can be placed in backend/app/data/ansys_benchmarks/ to enable formal ANSYS verification."
        ),
        "guidelines": "Refer to backend/app/data/ansys_benchmarks/README.md for directory layout and CSV column conventions."
    }


