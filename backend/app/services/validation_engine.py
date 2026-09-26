import math

def calculate_analytical_reference(geometry, material, climate, operating, duration_hours):
    """
    Independent reference solver for Steady-State Mean Temperature.
    Assumes:
    - Sinusoidal outdoor temp averages to climate["temperature"]
    - Constant internal heat gain
    - No solar gain (assumes nighttime or solar_absorptivity=0)
    - Emissivity=0
    - Convection is considered.
    - Long-term mean indoor temperature converges to a steady state energy balance.
    """
    wall_area = geometry["wall_area"]
    roof_area = geometry["roof_area"]
    volume = geometry["volume"]
    
    T_out_mean = climate["temperature"]
    wind_speed = climate["wind_speed"]
    
    occupants = operating["occupants"]
    heat_per_person = operating["heat_per_person"]
    ach = operating["air_changes_per_hour"]
    
    Q_internal = occupants * heat_per_person
    
    # Material
    k = material["thermal_conductivity"]
    thickness = material["thickness"]
    r_value = thickness / k
    u_value = 1 / r_value if r_value > 0 else float("inf")
    
    # Convection
    h_conv_ext = 5.8 + 3.94 * wind_speed
    
    U_eff = 1 / ((1/u_value) + (1/h_conv_ext))
    UA_total = U_eff * (wall_area + roof_area)
    
    # Ventilation UA
    AIR_DENSITY = 1.225
    AIR_SPECIFIC_HEAT = 1005
    vol_flow = (ach * volume) / 3600
    m_dot = vol_flow * AIR_DENSITY
    UA_vent = m_dot * AIR_SPECIFIC_HEAT
    
    # Steady state mean
    T_in_mean = T_out_mean + (Q_internal / (UA_total + UA_vent))
    
    return {
        "expected_mean_temperature": round(T_in_mean, 4),
        "time_series": [round(T_in_mean, 4) for _ in range(int(duration_hours))]
    }

def calculate_metrics(production_ts, reference_ts):
    n = len(production_ts)
    if n == 0 or len(reference_ts) != n:
        return {"error": "Timeseries length mismatch"}
        
    mae = 0.0
    rmse_sum = 0.0
    max_err = 0.0
    mean_diff_sum = 0.0
    
    for p, r in zip(production_ts, reference_ts):
        diff = p - r
        abs_diff = abs(diff)
        
        mae += abs_diff
        rmse_sum += diff * diff
        max_err = max(max_err, abs_diff)
        mean_diff_sum += diff
        
    mae /= n
    rmse = math.sqrt(rmse_sum / n)
    mean_diff = mean_diff_sum / n
    
    # Relative error based on MAE and average reference magnitude
    avg_ref = sum(abs(r) for r in reference_ts) / n
    rel_error = (mae / avg_ref * 100) if avg_ref > 0 else (mae * 100)
    
    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "max_absolute_error": round(max_err, 4),
        "mean_temperature_difference": round(mean_diff, 4),
        "relative_error_percent": round(rel_error, 4)
    }


# --- Transient RC Reference Solver --------------------------------------------
#
# Simplified first-order thermal RC benchmark.
#
# Physical model:
#   C * dT/dt = (T_out - T_indoor) / R_eff + Q_internal
#
# where:
#   R_eff = 1 / ( U_eff * A_total )        [K/W]
#   U_eff = 1 / ( thickness/k + 1/h_conv ) [W/m2K]
#   C     = air_mass * Cp_air              [J/K]
#
# This deliberately EXCLUDES:
#   - wall / roof thermal mass (negligible in the 1st-order model)
#   - radiation (emissivity = 0 in the benchmark)
#   - solar gain (solar_absorptivity = 0 in the benchmark)
#   - sinusoidal outdoor temperature swing (T_outdoor = constant)
#
# Analytical solution (constant T_out and Q_internal):
#   T_ss  = T_out + Q_internal * R_eff        [steady state, Celsius]
#   tau   = R_eff * C                          [time constant, seconds]
#   T(t)  = T_ss + (T_initial - T_ss) * exp(-t / tau)
#
# Reference: Incropera et al., "Fundamentals of Heat and Mass Transfer",
# 7th ed., Section 5.3 (Lumped Capacitance Method).

def transient_rc_analytical_reference(
    T_initial, T_outdoor, Q_internal, R_eff, C_air, duration_hours, timestep_hours
):
    """
    Compute the analytical first-order RC transient reference solution.
    Does NOT call run_thermal_simulation.
    """
    tau_seconds = R_eff * C_air
    T_ss = T_outdoor + Q_internal * R_eff

    num_steps = int(round(duration_hours / timestep_hours))
    dt_seconds = timestep_hours * 3600.0

    reference_ts = []
    for i in range(num_steps):
        t = (i + 1) * dt_seconds
        T_ref = T_ss + (T_initial - T_ss) * math.exp(-t / tau_seconds)
        reference_ts.append(round(T_ref, 6))

    return {
        "T_ss": round(T_ss, 4),
        "tau_seconds": round(tau_seconds, 2),
        "tau_hours": round(tau_seconds / 3600.0, 4),
        "R_eff": round(R_eff, 6),
        "C_air": round(C_air, 2),
        "time_series": reference_ts,
    }


def derive_rc_params(geometry, material, climate, operating):
    """
    Compute R_eff and C_air from the same physical inputs used by thermal_engine.py.
    Mirrors the production model parameter derivation WITHOUT calling run_thermal_simulation.

    Excluded from 1st-order model:
      - wall/roof thermal mass
      - radiation
      - solar gain
    """
    wall_area  = geometry["wall_area"]
    roof_area  = geometry["roof_area"]
    volume     = geometry["volume"]

    k          = material["thermal_conductivity"]
    thickness  = material["thickness"]
    wind_speed = climate["wind_speed"]
    ach        = operating["air_changes_per_hour"]

    r_cond  = thickness / k
    u_cond  = 1.0 / r_cond if r_cond > 0 else float("inf")
    h_conv  = 5.8 + 3.94 * wind_speed
    U_eff   = 1.0 / (1.0 / u_cond + 1.0 / h_conv)
    UA_shell = U_eff * (wall_area + roof_area)

    AIR_DENSITY = 1.225
    AIR_CP      = 1005.0
    vol_flow    = (ach * volume) / 3600.0
    UA_vent     = vol_flow * AIR_DENSITY * AIR_CP

    UA_total = UA_shell + UA_vent
    R_eff    = 1.0 / UA_total
    air_mass = volume * AIR_DENSITY
    C_air    = air_mass * AIR_CP

    return {
        "R_eff":      R_eff,
        "C_air":      C_air,
        "UA_shell":   UA_shell,
        "UA_vent":    UA_vent,
        "UA_total":   UA_total,
        "h_conv_ext": h_conv,
        "U_eff":      U_eff,
    }


def calculate_transient_metrics(production_ts, reference_ts):
    """
    Extended metrics for transient validation including final temperature error.
    """
    base = calculate_metrics(production_ts, reference_ts)
    # Final temperature error: last point of production vs reference
    final_err = round(production_ts[-1] - reference_ts[-1], 4) if production_ts and reference_ts else None
    base["final_temperature_error"] = final_err
    return base
