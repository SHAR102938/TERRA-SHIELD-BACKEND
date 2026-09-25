"""
Radiation heat transfer for building thermal analysis.

Implements:
  - Long-wave radiation exchange (Stefan-Boltzmann)
  - Sky temperature model
  - Solar radiation absorption on opaque surfaces
  - Radiative heat transfer coefficient linearization
"""

from __future__ import annotations

import math

# Stefan-Boltzmann constant W/(m²·K⁴)
SIGMA = 5.67e-8

# Typical surface emissivities
EMISSIVITY_WALL = 0.9       # Painted/plastered wall
EMISSIVITY_ROOF = 0.9       # Standard roofing
EMISSIVITY_GLASS = 0.84     # Standard glass
EMISSIVITY_GROUND = 0.95    # Soil/ground


def sky_temperature(t_air_c: float, relative_humidity: float = 50.0) -> float:
    """
    Estimate effective sky temperature for long-wave radiation exchange.

    Uses the Berdahl-Martin correlation:
        T_sky = T_air * (0.711 + 0.0056*T_dp + 0.000073*T_dp² + 0.013*cos(15t))^0.25

    Simplified version (without time dependence):
        T_sky ≈ T_air - (20 - 5*cloud_factor)  for clear sky ≈ T_air - 20°C

    More accurately using dew point:
        T_dp estimated from RH and T_air

    Args:
        t_air_c: Ambient air temperature °C
        relative_humidity: Relative humidity %

    Returns:
        Sky temperature in °C
    """
    # Estimate dew point using Magnus formula
    t_air = t_air_c
    rh = max(1.0, min(100.0, relative_humidity))

    a = 17.27
    b = 237.7
    gamma = (a * t_air / (b + t_air)) + math.log(rh / 100.0)
    t_dp = (b * gamma) / (a - gamma)

    # Berdahl-Martin simplified
    t_air_k = t_air + 273.15
    emissivity_sky = 0.711 + 0.0056 * t_dp + 0.000073 * t_dp ** 2
    emissivity_sky = max(0.5, min(1.0, emissivity_sky))

    t_sky_k = t_air_k * emissivity_sky ** 0.25
    return t_sky_k - 273.15


def longwave_radiation_flux(
    t_surface_c: float,
    t_sky_c: float,
    emissivity: float = EMISSIVITY_WALL,
    view_factor_sky: float = 0.5
) -> float:
    """
    Net long-wave radiation heat loss from a surface to the sky.

    Q_lw = ε * σ * F_sky * (T_surface⁴ - T_sky⁴)

    Args:
        t_surface_c: Surface temperature °C
        t_sky_c: Sky temperature °C
        emissivity: Surface emissivity (0–1)
        view_factor_sky: View factor to sky (0.5 for walls, ~1.0 for roof)

    Returns:
        Radiation heat flux density in W/m² (positive = heat loss from surface)
    """
    t_s = t_surface_c + 273.15
    t_sky = t_sky_c + 273.15
    return emissivity * SIGMA * view_factor_sky * (t_s ** 4 - t_sky ** 4)


def longwave_radiation_heat(
    t_surface_c: float,
    t_sky_c: float,
    area: float,
    emissivity: float = EMISSIVITY_WALL,
    view_factor_sky: float = 0.5
) -> float:
    """
    Total long-wave radiation heat transfer in W.

    Returns:
        Heat flow in W (positive = heat loss from surface)
    """
    q = longwave_radiation_flux(t_surface_c, t_sky_c, emissivity, view_factor_sky)
    return q * area


def solar_absorption(
    solar_irradiance: float,
    absorptivity: float,
    area: float
) -> float:
    """
    Solar radiation absorbed by an opaque surface.

    Q_sol = α * I * A

    Args:
        solar_irradiance: Incident solar radiation on the surface in W/m²
        absorptivity: Surface solar absorptivity (0–1), typically 0.3–0.9
        area: Surface area in m²

    Returns:
        Absorbed solar heat in W (always positive = heat gain)
    """
    return absorptivity * solar_irradiance * area


def solar_gain_through_window(
    solar_irradiance: float,
    shgc: float,
    area: float
) -> float:
    """
    Solar heat gain through a glazed opening.

    Q_sol,window = SHGC * I * A

    Args:
        solar_irradiance: Incident solar radiation on the window in W/m²
        shgc: Solar heat gain coefficient (0–1)
        area: Window area in m²

    Returns:
        Solar heat gain in W
    """
    return shgc * solar_irradiance * area


def radiative_heat_transfer_coefficient(
    t_surface_c: float,
    t_adjacent_c: float,
    emissivity: float = EMISSIVITY_WALL
) -> float:
    """
    Linearized radiative heat transfer coefficient for simplified calculations.

    h_r ≈ 4 * ε * σ * T_mean³

    where T_mean = (T1 + T2) / 2 in Kelvin.

    Returns:
        h_r in W/(m²·K)
    """
    t_mean_k = ((t_surface_c + t_adjacent_c) / 2.0) + 273.15
    return 4.0 * emissivity * SIGMA * t_mean_k ** 3


def total_surface_heat_exchange(
    t_surface_c: float,
    t_air_c: float,
    t_sky_c: float,
    h_conv: float,
    solar_incident: float = 0.0,
    absorptivity: float = 0.6,
    emissivity: float = EMISSIVITY_WALL,
    view_factor_sky: float = 0.5
) -> float:
    """
    Net heat flux density at an exterior surface (W/m²).

    Combines convection + long-wave radiation + solar absorption.
    Positive = net heat gain to the surface.

    Returns:
        Net surface heat flux density in W/m²
    """
    q_conv = h_conv * (t_air_c - t_surface_c)  # Positive if air warmer than surface
    q_solar = absorptivity * solar_incident  # Always positive (gain)
    q_lw = -longwave_radiation_flux(t_surface_c, t_sky_c, emissivity, view_factor_sky)  # Negative = gain

    return q_conv + q_solar + q_lw
