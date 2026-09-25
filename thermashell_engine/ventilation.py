"""
Ventilation and infiltration heat transfer.

Implements:
  - Natural ventilation heat loss/gain
  - Infiltration air change models
  - Combined ventilation heat transfer
"""

from __future__ import annotations

# Air properties at standard conditions
AIR_DENSITY = 1.225        # kg/m³ at 15°C, 101.325 kPa
AIR_SPECIFIC_HEAT = 1005   # J/(kg·K)


def air_density_at_altitude(elevation_m: float, t_air_c: float = 15.0) -> float:
    """
    Approximate air density adjusted for altitude and temperature.

    Uses barometric formula:
        ρ = ρ₀ * (T₀ / T) * exp(-g*M*h / (R*T₀))

    Simplified:
        ρ ≈ 1.225 * (1 - 2.25577e-5 * h)^5.25588 * (288.15 / (t + 273.15))

    Args:
        elevation_m: Site elevation above sea level in meters
        t_air_c: Air temperature °C

    Returns:
        Air density in kg/m³
    """
    # Pressure adjustment for altitude
    p_ratio = (1 - 2.25577e-5 * elevation_m) ** 5.25588
    # Temperature adjustment
    t_ratio = 288.15 / (t_air_c + 273.15)
    return AIR_DENSITY * p_ratio * t_ratio


def ventilation_volume_flow(
    ach: float,
    volume: float
) -> float:
    """
    Volume flow rate from air changes per hour.

    V̇ = ACH * Volume / 3600

    Args:
        ach: Air changes per hour
        volume: Room volume in m³

    Returns:
        Volume flow rate in m³/s
    """
    return ach * volume / 3600.0


def ventilation_heat_transfer(
    t_inside: float,
    t_outside: float,
    ach: float,
    volume: float,
    elevation_m: float = 0.0
) -> float:
    """
    Sensible heat transfer due to ventilation/infiltration.

    Q_vent = ρ * c_p * V̇ * (T_inside - T_outside)

    Args:
        t_inside: Indoor air temperature °C
        t_outside: Outdoor air temperature °C
        ach: Air changes per hour
        volume: Room volume in m³
        elevation_m: Site elevation for air density correction

    Returns:
        Heat transfer rate in W (positive = heat loss when T_inside > T_outside)
    """
    rho = air_density_at_altitude(elevation_m, t_outside)
    v_dot = ventilation_volume_flow(ach, volume)
    return rho * AIR_SPECIFIC_HEAT * v_dot * (t_inside - t_outside)


def total_ventilation_heat_loss(
    t_inside: float,
    t_outside: float,
    ach_natural: float,
    ach_infiltration: float,
    volume: float,
    elevation_m: float = 0.0
) -> float:
    """
    Combined heat transfer from natural ventilation + infiltration.

    Args:
        t_inside: Indoor temperature °C
        t_outside: Outdoor temperature °C
        ach_natural: Natural ventilation ACH
        ach_infiltration: Infiltration ACH
        volume: Room volume in m³
        elevation_m: Site elevation m

    Returns:
        Total ventilation heat transfer in W (positive = heat loss)
    """
    total_ach = ach_natural + ach_infiltration
    return ventilation_heat_transfer(t_inside, t_outside, total_ach, volume, elevation_m)


def stack_effect_ach(
    t_inside: float,
    t_outside: float,
    height: float,
    opening_area: float = 0.01,
    discharge_coeff: float = 0.65,
    volume: float = 72.0
) -> float:
    """
    Estimate air changes per hour from stack effect (buoyancy-driven ventilation).

    V̇ = Cd * A * sqrt(2 * g * H * |ΔT| / T_mean)

    Args:
        t_inside: Indoor temperature °C
        t_outside: Outdoor temperature °C
        height: Effective stack height in m (distance between inlet and outlet)
        opening_area: Effective opening area in m² (combined inlet+outlet, with Cd)
        discharge_coeff: Discharge coefficient (~0.6–0.7)
        volume: Room volume in m³

    Returns:
        Estimated ACH from stack effect
    """
    import math

    dt = abs(t_inside - t_outside)
    if dt < 0.1:
        return 0.0

    t_mean_k = ((t_inside + t_outside) / 2.0) + 273.15
    g = 9.81

    v_dot = discharge_coeff * opening_area * math.sqrt(2 * g * height * dt / t_mean_k)
    ach = v_dot * 3600.0 / volume
    return ach
