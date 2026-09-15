"""
Convective heat transfer coefficients for building surfaces.

Implements:
  - Interior natural convection (buoyancy-driven)
  - Exterior forced convection (wind-driven)
  - Combined convection correlations per ASHRAE/ISO standards
"""

from __future__ import annotations

import math


def interior_convection_coefficient(
    t_surface: float,
    t_air: float,
    surface_type: str = "wall"
) -> float:
    """
    Interior convective heat transfer coefficient h_c,i.

    Uses simplified natural convection correlations:
      - Vertical surfaces (walls): h = 1.5 * |ΔT|^(1/3)  [typically 2–5 W/(m²·K)]
      - Horizontal, heat flow up (warm ceiling): h = 1.8 * |ΔT|^(1/3)
      - Horizontal, heat flow down (warm floor): h = 0.7 * |ΔT|^(1/3)

    Args:
        t_surface: Surface temperature °C
        t_air: Room air temperature °C
        surface_type: "wall", "ceiling", or "floor"

    Returns:
        h_c in W/(m²·K), minimum 0.5 to avoid division issues
    """
    dt = abs(t_surface - t_air)
    if dt < 0.01:
        dt = 0.01  # Avoid zero

    dt_third = dt ** (1.0 / 3.0)

    if surface_type == "ceiling":
        # Heat flow upward (warm ceiling) — enhanced convection
        h = 1.8 * dt_third
    elif surface_type == "floor":
        # Heat flow downward (warm floor) — suppressed convection
        h = 0.7 * dt_third
    else:
        # Vertical surface (wall)
        h = 1.5 * dt_third

    return max(h, 0.5)


def exterior_convection_coefficient(
    wind_speed: float,
    surface_type: str = "wall"
) -> float:
    """
    Exterior convective heat transfer coefficient h_c,e.

    Uses the McAdams correlation for building surfaces:
      h_c,e = 5.7 + 3.8 * v   (for windward surfaces)

    For low-wind conditions, natural convection dominates:
      h_c,e ≈ 4.0 W/(m²·K) minimum

    Args:
        wind_speed: Wind speed at building height in m/s
        surface_type: "wall" or "roof" (roof gets slightly higher coefficient)

    Returns:
        h_c in W/(m²·K)
    """
    # McAdams correlation (windward wall)
    h_forced = 5.7 + 3.8 * wind_speed

    # Natural convection baseline
    h_natural = 4.0

    # Roof typically experiences higher convection
    if surface_type == "roof":
        h_forced *= 1.2

    return max(h_forced, h_natural)


def combined_convection_coefficient(
    t_surface: float,
    t_air: float,
    wind_speed: float = 0.0,
    is_exterior: bool = True,
    surface_type: str = "wall"
) -> float:
    """
    Combined convective heat transfer coefficient.

    For exterior: uses wind-driven correlation.
    For interior: uses natural convection correlation.

    Args:
        t_surface: Surface temperature °C
        t_air: Adjacent air temperature °C
        wind_speed: Wind speed m/s (exterior only)
        is_exterior: Whether this is an exterior surface
        surface_type: "wall", "roof", "ceiling", or "floor"

    Returns:
        h_c in W/(m²·K)
    """
    if is_exterior:
        return exterior_convection_coefficient(wind_speed, surface_type)
    else:
        return interior_convection_coefficient(t_surface, t_air, surface_type)


def convective_heat_flux(
    t_surface: float,
    t_air: float,
    h_c: float,
    area: float
) -> float:
    """
    Convective heat transfer rate.

    Q = h_c * A * (T_surface - T_air)

    Returns:
        Heat flow in W (positive = heat from surface to air)
    """
    return h_c * area * (t_surface - t_air)


def wind_speed_at_height(
    v_ref: float,
    z_ref: float = 10.0,
    z_target: float = 3.0,
    terrain_exponent: float = 0.22
) -> float:
    """
    Adjust wind speed from reference height to building height using power law.

    v(z) = v_ref * (z / z_ref)^α

    Args:
        v_ref: Reference wind speed (typically at 10m) in m/s
        z_ref: Reference measurement height in m
        z_target: Target height (e.g., building mid-height) in m
        terrain_exponent: Power law exponent α (0.14=open, 0.22=suburban, 0.33=urban)

    Returns:
        Wind speed at target height in m/s
    """
    if z_ref <= 0 or z_target <= 0:
        return v_ref
    return v_ref * (z_target / z_ref) ** terrain_exponent
