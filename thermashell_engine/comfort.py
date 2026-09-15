"""
Thermal comfort assessment models.

Implements:
  - PMV/PPD (Fanger model) per ISO 7730
  - Adaptive comfort model per ASHRAE Standard 55
  - Operative temperature
"""

from __future__ import annotations

import math


def operative_temperature(
    t_air: float,
    t_mean_radiant: float,
    air_velocity: float = 0.1
) -> float:
    """
    Operative temperature combining air and mean radiant temperature.

    For low air speeds (< 0.2 m/s):
        T_op = (T_air + T_mrt) / 2

    For higher speeds:
        T_op = A*T_air + (1-A)*T_mrt  where A depends on velocity

    Args:
        t_air: Air temperature °C
        t_mean_radiant: Mean radiant temperature °C
        air_velocity: Air velocity m/s

    Returns:
        Operative temperature °C
    """
    if air_velocity < 0.2:
        return (t_air + t_mean_radiant) / 2.0
    elif air_velocity < 0.6:
        a = 0.6
    else:
        a = 0.7
    return a * t_air + (1 - a) * t_mean_radiant


def pmv(
    t_air: float,
    t_mean_radiant: float,
    air_velocity: float = 0.1,
    relative_humidity: float = 50.0,
    metabolic_rate: float = 1.2,  # met (1 met = 58.15 W/m²)
    clothing_insulation: float = 1.0  # clo (1 clo = 0.155 m²·K/W)
) -> float:
    """
    Predicted Mean Vote (PMV) per ISO 7730 / Fanger model.

    PMV ranges from -3 (cold) to +3 (hot), with 0 = neutral.

    Args:
        t_air: Air temperature °C
        t_mean_radiant: Mean radiant temperature °C
        air_velocity: Relative air velocity m/s
        relative_humidity: Relative humidity %
        metabolic_rate: Metabolic rate in met units
        clothing_insulation: Clothing insulation in clo units

    Returns:
        PMV value (-3 to +3)
    """
    M = metabolic_rate * 58.15  # W/m²
    W = 0  # External work (typically 0)
    I_cl = clothing_insulation * 0.155  # m²·K/W

    # Water vapor partial pressure
    p_a = relative_humidity * 10 * math.exp(16.6536 - 4030.183 / (t_air + 235.0))

    # Clothing surface area factor
    if I_cl <= 0.078:
        f_cl = 1.0 + 1.290 * I_cl
    else:
        f_cl = 1.05 + 0.645 * I_cl

    # Clothing surface temperature calculation per ISO 7730
    t_skin = 35.7 - 0.028 * (M - W)
    t_cl = (t_skin + t_air) / 2.0  # Initial midpoint guess

    for _ in range(150):
        h_cf = 12.1 * math.sqrt(air_velocity)
        h_cn = 2.38 * abs(t_cl - t_air) ** 0.25
        h_c = max(h_cf, h_cn)

        t_cl_k = max(180.0, min(380.0, t_cl + 273.15))
        t_mrt_k = max(180.0, min(380.0, t_mean_radiant + 273.15))

        q_rad = 3.96e-8 * f_cl * (t_cl_k ** 4 - t_mrt_k ** 4)
        q_conv = f_cl * h_c * (t_cl - t_air)

        t_cl_next = t_skin - I_cl * (q_rad + q_conv)
        t_cl_new = 0.7 * t_cl + 0.3 * t_cl_next

        if abs(t_cl_new - t_cl) < 0.001:
            t_cl = t_cl_new
            break
        t_cl = t_cl_new

    h_cf = 12.1 * math.sqrt(air_velocity)
    h_cn = 2.38 * abs(t_cl - t_air) ** 0.25
    h_c = max(h_cf, h_cn)
    t_cl_k = max(180.0, min(380.0, t_cl + 273.15))
    t_mrt_k = max(180.0, min(380.0, t_mean_radiant + 273.15))

    # PMV equation per ISO 7730
    pmv_val = (0.303 * math.exp(-0.036 * M) + 0.028) * (
        (M - W) -
        3.05e-3 * (5733 - 6.99 * (M - W) - p_a) -
        0.42 * ((M - W) - 58.15) -
        1.7e-5 * M * (5867 - p_a) -
        0.0014 * M * (34 - t_air) -
        3.96e-8 * f_cl * (t_cl_k ** 4 - t_mrt_k ** 4) -
        f_cl * h_c * (t_cl - t_air)
    )

    return max(-3.0, min(3.0, pmv_val))


def ppd(pmv_value: float) -> float:
    """
    Predicted Percentage of Dissatisfied from PMV.

    PPD = 100 - 95 * exp(-0.03353 * PMV⁴ - 0.2179 * PMV²)

    Args:
        pmv_value: PMV value (-3 to +3)

    Returns:
        PPD percentage (5–100%)
    """
    ppd_val = 100.0 - 95.0 * math.exp(-0.03353 * pmv_value ** 4 - 0.2179 * pmv_value ** 2)
    return max(5.0, min(100.0, ppd_val))


def adaptive_comfort_limits(t_outdoor_running_mean: float) -> tuple[float, float, float]:
    """
    Adaptive comfort temperature limits per ASHRAE 55.

    Applicable for naturally ventilated buildings, 10°C ≤ T_out_rm ≤ 33.5°C.

    T_comfort = 0.31 * T_out_rm + 17.8

    Returns:
        (T_comfort_lower, T_comfort_neutral, T_comfort_upper) in °C
        Using ±3.5°C for 90% acceptability
    """
    t_rm = max(10.0, min(33.5, t_outdoor_running_mean))
    t_neutral = 0.31 * t_rm + 17.8

    # 80% acceptability: ±3.5°C
    return (t_neutral - 3.5, t_neutral, t_neutral + 3.5)


def is_comfortable(
    t_operative: float,
    t_target: float,
    comfort_band: float = 2.0,
    pmv_value: float | None = None
) -> bool:
    """
    Check if conditions are within comfort zone.

    Primary check: operative temperature within target ± band.
    Secondary check: if PMV provided, |PMV| < 0.7 (corresponds to ~15% PPD).

    Returns:
        True if comfortable
    """
    temp_ok = abs(t_operative - t_target) <= comfort_band

    if pmv_value is not None:
        pmv_ok = abs(pmv_value) < 0.7
        return temp_ok and pmv_ok

    return temp_ok


def compute_comfort_metrics(
    indoor_temps: list[float],
    outdoor_temps: list[float],
    target_temp: float,
    comfort_band: float = 2.0,
    relative_humidity: float = 50.0,
    metabolic_rate: float = 1.2,
    clothing_insulation: float = 1.0,
    air_velocity: float = 0.1
) -> dict:
    """
    Compute comfort metrics over a simulation period.

    Args:
        indoor_temps: Hourly indoor temperature °C
        outdoor_temps: Hourly outdoor temperature °C
        target_temp: Target comfort temperature °C
        comfort_band: ± comfort band °C

    Returns:
        Dict with pmv_mean, ppd_mean, comfort_hours, total_hours,
        comfort_percentage, hours_below, hours_above
    """
    n = len(indoor_temps)
    if n == 0:
        return {"pmv_mean": 0, "ppd_mean": 0, "comfort_hours": 0,
                "total_hours": 0, "comfort_percentage": 0,
                "hours_below_comfort": 0, "hours_above_comfort": 0,
                "operative_temp_mean_c": 0}

    pmv_values = []
    ppd_values = []
    comfort_count = 0
    below_count = 0
    above_count = 0
    op_temps = []

    for i in range(n):
        t_in = indoor_temps[i]
        # Approximate mean radiant as indoor air temp (simplified)
        t_mrt = t_in
        t_op = operative_temperature(t_in, t_mrt, air_velocity)
        op_temps.append(t_op)

        pmv_val = pmv(t_in, t_mrt, air_velocity, relative_humidity,
                      metabolic_rate, clothing_insulation)
        ppd_val = ppd(pmv_val)
        pmv_values.append(pmv_val)
        ppd_values.append(ppd_val)

        if is_comfortable(t_op, target_temp, comfort_band, pmv_val):
            comfort_count += 1
        elif t_op < target_temp - comfort_band:
            below_count += 1
        else:
            above_count += 1

    return {
        "pmv_mean": sum(pmv_values) / n,
        "ppd_mean": sum(ppd_values) / n,
        "comfort_hours": comfort_count,
        "total_hours": n,
        "comfort_percentage": round(100 * comfort_count / n, 1),
        "hours_below_comfort": below_count,
        "hours_above_comfort": above_count,
        "operative_temp_mean_c": round(sum(op_temps) / n, 2),
    }
