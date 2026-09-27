"""
Generate test fixture CSVs for ANSYS benchmark cases.

These are NOT ANSYS results — they are independent analytical 1st-order RC
transient solutions used as test fixtures to exercise the validation pipeline.

Run from repository root:
    python backend/app/data/ansys_benchmarks/generate_fixtures.py
"""

import csv
import json
import math
import os

DIR = os.path.dirname(os.path.abspath(__file__))

# ── Physical constants ────────────────────────────────────────────────────
AIR_DENSITY = 1.225   # kg/m³
AIR_CP = 1005.0       # J/(kg·K)

# ── Common geometry (5m × 4m × 3m box, flat roof) ────────────────────────
LENGTH, WIDTH, HEIGHT = 5.0, 4.0, 3.0
WALL_AREA = 2 * (LENGTH + WIDTH) * HEIGHT  # 54 m²
ROOF_AREA = LENGTH * WIDTH                 # 20 m²
VOLUME = LENGTH * WIDTH * HEIGHT           # 60 m³

T_OUTDOOR = 10.0   # Constant outdoor temperature °C
WIND_SPEED = 2.0   # m/s

# ── Case definitions ─────────────────────────────────────────────────────
CASES = [
    {
        "case_id": "ansys_case_a",
        "directory": "case_a_moderate_tau",
        "display_name": "Case A — Moderate Tau",
        "k": 0.04,        # Insulated Fabric
        "thickness": 0.15,
        "density": 30,
        "specific_heat": 1200,
        "ach": 0.5,
        "T_initial": 30.0,
        "Q_internal": 0.0,
        "duration_hours": 48,
        "timestep_s": 3600,
    },
    {
        "case_id": "ansys_case_b",
        "directory": "case_b_high_ventilation",
        "display_name": "Case B — High Ventilation",
        "k": 0.038,       # Rock Wool
        "thickness": 0.05,
        "density": 100,
        "specific_heat": 840,
        "ach": 2.0,
        "T_initial": 30.0,
        "Q_internal": 0.0,
        "duration_hours": 24,
        "timestep_s": 3600,
    },
    {
        "case_id": "ansys_case_c",
        "directory": "case_c_heavy_insulation",
        "display_name": "Case C — Heavy Insulation",
        "k": 0.04,        # Fiberglass
        "thickness": 0.25,
        "density": 12,
        "specific_heat": 840,
        "ach": 0.2,
        "T_initial": 30.0,
        "Q_internal": 0.0,
        "duration_hours": 72,
        "timestep_s": 3600,
    },
]


def compute_rc(k, thickness, ach):
    """Compute effective R and C for the 1st-order RC model."""
    r_cond = thickness / k
    u_cond = 1.0 / r_cond
    h_conv = 5.8 + 3.94 * WIND_SPEED
    U_eff = 1.0 / (1.0 / u_cond + 1.0 / h_conv)
    UA_shell = U_eff * (WALL_AREA + ROOF_AREA)
    vol_flow = (ach * VOLUME) / 3600.0
    UA_vent = vol_flow * AIR_DENSITY * AIR_CP
    UA_total = UA_shell + UA_vent
    R_eff = 1.0 / UA_total
    C_air = VOLUME * AIR_DENSITY * AIR_CP
    return R_eff, C_air


def analytical_solution(T_initial, T_outdoor, Q_internal, R_eff, C_air,
                        duration_hours, timestep_s):
    """Exact exponential decay: T(t) = T_ss + (T0 - T_ss) * exp(-t/τ)"""
    tau = R_eff * C_air
    T_ss = T_outdoor + Q_internal * R_eff
    n_steps = int(duration_hours * 3600 / timestep_s)
    rows = []
    for i in range(n_steps + 1):
        t = i * timestep_s
        T = T_ss + (T_initial - T_ss) * math.exp(-t / tau)
        rows.append((t, round(T, 6)))
    return rows, tau, T_ss


def main():
    for case in CASES:
        case_dir = os.path.join(DIR, case["directory"])
        os.makedirs(case_dir, exist_ok=True)

        R_eff, C_air = compute_rc(case["k"], case["thickness"], case["ach"])
        rows, tau, T_ss = analytical_solution(
            case["T_initial"], T_OUTDOOR, case["Q_internal"],
            R_eff, C_air, case["duration_hours"], case["timestep_s"],
        )

        # Write CSV
        csv_path = os.path.join(case_dir, "temperature.csv")
        with open(csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["time_s", "indoor_temperature_c"])
            writer.writerows(rows)

        # Write metadata
        metadata = {
            "case_id": case["case_id"],
            "display_name": case["display_name"],
            "source": "TEST_FIXTURE",
            "source_type": "analytical_rc_1st_order",
            "software": "Python analytical solver (generate_fixtures.py)",
            "software_version": "1.0",
            "geometry": {
                "length_m": LENGTH,
                "width_m": WIDTH,
                "height_m": HEIGHT,
                "wall_area_m2": WALL_AREA,
                "roof_area_m2": ROOF_AREA,
                "volume_m3": VOLUME,
            },
            "material": {
                "thermal_conductivity_WpmK": case["k"],
                "thickness_m": case["thickness"],
                "density_kgpm3": case["density"],
                "specific_heat_JpkgK": case["specific_heat"],
            },
            "boundary_conditions": {
                "outdoor_temperature_c": T_OUTDOOR,
                "wind_speed_ms": WIND_SPEED,
                "solar_radiation_Wpm2": 0.0,
                "emissivity": 0.0,
                "solar_absorptivity": 0.0,
            },
            "ventilation": {
                "air_changes_per_hour": case["ach"],
            },
            "initial_conditions": {
                "indoor_temperature_c": case["T_initial"],
                "internal_heat_gain_W": case["Q_internal"],
            },
            "simulation": {
                "duration_hours": case["duration_hours"],
                "duration_s": case["duration_hours"] * 3600,
                "timestep_s": case["timestep_s"],
            },
            "derived_rc_params": {
                "R_eff_KperW": round(R_eff, 8),
                "C_air_JperK": round(C_air, 2),
                "tau_seconds": round(tau, 2),
                "tau_hours": round(tau / 3600.0, 4),
                "T_ss_c": round(T_ss, 4),
            },
            "temperature_variable": "indoor_air_temperature",
            "temperature_unit": "degC",
            "provenance": {
                "dataset_status": "fixture_only",
                "description": (
                    "Test fixture generated from analytical 1st-order RC solution. "
                    "NOT real ANSYS data. Replace with genuine ANSYS export for "
                    "production validation."
                ),
                "generated_by": "generate_fixtures.py",
                "reference": (
                    "Incropera et al., Fundamentals of Heat and Mass Transfer, "
                    "7th ed., Section 5.3 (Lumped Capacitance Method)"
                ),
            },
        }

        meta_path = os.path.join(case_dir, "metadata.json")
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"[OK] {case['case_id']}: {len(rows)} points, tau={tau/3600:.2f}h, T_ss={T_ss:.2f}C")


if __name__ == "__main__":
    main()
