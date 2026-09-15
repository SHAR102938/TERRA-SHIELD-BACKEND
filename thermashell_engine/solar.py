"""
Solar geometry and incident radiation calculations.

Implements:
  - Solar declination, hour angle, altitude, azimuth
  - Incident solar radiation on tilted/oriented surfaces
  - Shading fraction estimates
"""

from __future__ import annotations

import math
from datetime import datetime, timezone


def day_of_year(dt: datetime) -> int:
    """Day of year (1–366) from a datetime."""
    return dt.timetuple().tm_yday


def solar_declination(day_number: int) -> float:
    """
    Solar declination angle in degrees.

    δ = 23.45 * sin(360/365 * (284 + n))

    Args:
        day_number: Day of year (1–366)

    Returns:
        Declination in degrees
    """
    return 23.45 * math.sin(math.radians(360.0 / 365.0 * (284 + day_number)))


def equation_of_time(day_number: int) -> float:
    """
    Equation of time in minutes.

    Accounts for Earth's orbital eccentricity and axial tilt.
    """
    B = math.radians(360.0 / 365.0 * (day_number - 81))
    return 9.87 * math.sin(2 * B) - 7.53 * math.cos(B) - 1.5 * math.sin(B)


def solar_hour_angle(hour: float, longitude: float, day_number: int, timezone_offset: float = 5.5) -> float:
    """
    Solar hour angle in degrees.

    ω = 15 * (AST - 12) where AST = apparent solar time

    Args:
        hour: Local clock hour (0–23, can be fractional)
        longitude: Site longitude in degrees
        day_number: Day of year
        timezone_offset: Hours from UTC (default 5.5 for IST)

    Returns:
        Hour angle in degrees (negative before solar noon, positive after)
    """
    eot = equation_of_time(day_number)
    # Standard meridian for the timezone
    lstm = 15.0 * timezone_offset
    # Time correction
    tc = 4.0 * (longitude - lstm) + eot  # minutes
    # Apparent solar time
    ast = hour + tc / 60.0
    return 15.0 * (ast - 12.0)


def solar_altitude(latitude: float, declination: float, hour_angle: float) -> float:
    """
    Solar altitude angle above the horizon in degrees.

    sin(α) = sin(φ)*sin(δ) + cos(φ)*cos(δ)*cos(ω)
    """
    lat_r = math.radians(latitude)
    dec_r = math.radians(declination)
    ha_r = math.radians(hour_angle)

    sin_alt = (math.sin(lat_r) * math.sin(dec_r) +
               math.cos(lat_r) * math.cos(dec_r) * math.cos(ha_r))
    sin_alt = max(-1.0, min(1.0, sin_alt))
    return math.degrees(math.asin(sin_alt))


def solar_azimuth(latitude: float, declination: float, hour_angle: float, altitude: float) -> float:
    """
    Solar azimuth angle in degrees from North (clockwise: N=0, E=90, S=180, W=270).

    cos(A) = (sin(δ) - sin(α)*sin(φ)) / (cos(α)*cos(φ))
    """
    lat_r = math.radians(latitude)
    dec_r = math.radians(declination)
    alt_r = math.radians(altitude)

    cos_alt = math.cos(alt_r)
    if cos_alt < 0.001:
        return 180.0  # Sun at zenith

    cos_az = (math.sin(dec_r) - math.sin(alt_r) * math.sin(lat_r)) / (cos_alt * math.cos(lat_r))
    cos_az = max(-1.0, min(1.0, cos_az))
    azimuth = math.degrees(math.acos(cos_az))

    # Adjust for afternoon (hour angle positive)
    if hour_angle > 0:
        azimuth = 360.0 - azimuth

    return azimuth


def incident_solar_on_surface(
    ghi: float,
    altitude_deg: float,
    azimuth_deg: float,
    surface_tilt_deg: float,
    surface_azimuth_deg: float,
    dni: float | None = None,
    dhi: float | None = None
) -> float:
    """
    Compute solar irradiance incident on a tilted surface.

    If DNI and DHI are provided, uses the Perez-like decomposition:
        I_surface = DNI * cos(θ_incidence) + DHI * F_sky + GHI * ρ * F_ground

    If only GHI is available, estimates using isotropic sky model:
        I_surface ≈ GHI * (cos(θ_incidence) / sin(altitude)) for beam component
        + GHI * 0.5 * (1 + cos(tilt)) for diffuse
        + GHI * 0.2 * 0.5 * (1 - cos(tilt)) for ground reflection

    Args:
        ghi: Global horizontal irradiance W/m²
        altitude_deg: Solar altitude in degrees
        azimuth_deg: Solar azimuth in degrees (from N)
        surface_tilt_deg: Surface tilt from horizontal (0=horizontal, 90=vertical wall)
        surface_azimuth_deg: Surface facing direction from N (180=south-facing)
        dni: Direct normal irradiance W/m² (optional)
        dhi: Diffuse horizontal irradiance W/m² (optional)

    Returns:
        Incident solar radiation on the surface in W/m²
    """
    if altitude_deg <= 0:
        return 0.0  # Sun below horizon

    alt_r = math.radians(altitude_deg)
    az_r = math.radians(azimuth_deg)
    tilt_r = math.radians(surface_tilt_deg)
    surf_az_r = math.radians(surface_azimuth_deg)

    # Angle of incidence on tilted surface
    cos_theta = (math.sin(alt_r) * math.cos(tilt_r) +
                 math.cos(alt_r) * math.sin(tilt_r) * math.cos(az_r - surf_az_r))
    cos_theta = max(0.0, cos_theta)  # No negative incidence

    ground_reflectance = 0.2  # Typical albedo

    if dni is not None and dhi is not None:
        # Use decomposed components
        i_beam = dni * cos_theta
        i_diffuse = dhi * 0.5 * (1 + math.cos(tilt_r))
        i_reflected = ghi * ground_reflectance * 0.5 * (1 - math.cos(tilt_r))
        return max(0.0, i_beam + i_diffuse + i_reflected)
    else:
        # Estimate from GHI only — isotropic sky model
        sin_alt = math.sin(alt_r)
        if sin_alt < 0.01:
            sin_alt = 0.01

        # Approximate beam fraction (Orgill-Hollands clearness index)
        kt = min(1.0, ghi / (1367.0 * sin_alt)) if sin_alt > 0 else 0
        if kt <= 0.35:
            fd = 1.0 - 0.249 * kt  # Diffuse fraction
        elif kt <= 0.75:
            fd = 1.557 - 1.84 * kt
        else:
            fd = 0.177

        fd = max(0.1, min(1.0, fd))
        dhi_est = fd * ghi
        dni_est = (ghi - dhi_est) / sin_alt if sin_alt > 0.01 else 0

        i_beam = max(0, dni_est) * cos_theta
        i_diffuse = dhi_est * 0.5 * (1 + math.cos(tilt_r))
        i_reflected = ghi * ground_reflectance * 0.5 * (1 - math.cos(tilt_r))

        return max(0.0, i_beam + i_diffuse + i_reflected)


def compute_solar_position(
    latitude: float,
    longitude: float,
    dt: datetime,
    timezone_offset: float = 5.5
) -> tuple[float, float]:
    """
    Compute solar altitude and azimuth for a given location and time.

    Args:
        latitude: Degrees N
        longitude: Degrees E
        dt: Datetime (local time)
        timezone_offset: Hours from UTC

    Returns:
        (altitude_deg, azimuth_deg)
    """
    doy = day_of_year(dt)
    hour = dt.hour + dt.minute / 60.0

    decl = solar_declination(doy)
    ha = solar_hour_angle(hour, longitude, doy, timezone_offset)
    alt = solar_altitude(latitude, decl, ha)
    az = solar_azimuth(latitude, decl, ha, alt)

    return alt, az


def solar_irradiance_on_walls(
    ghi: float,
    altitude_deg: float,
    azimuth_deg: float,
    orientation_deg: float = 180.0,
    dni: float | None = None,
    dhi: float | None = None
) -> dict[str, float]:
    """
    Compute incident solar radiation on all four walls + roof.

    Args:
        ghi: Global horizontal irradiance W/m²
        altitude_deg: Solar altitude degrees
        azimuth_deg: Solar azimuth degrees
        orientation_deg: Building orientation (front face azimuth from N)
        dni, dhi: Optional decomposed irradiance

    Returns:
        Dict with keys: 'north', 'south', 'east', 'west', 'roof'
    """
    result = {}

    # Wall azimuths relative to building orientation
    wall_azimuths = {
        "south": orientation_deg,
        "west": (orientation_deg + 90) % 360,
        "north": (orientation_deg + 180) % 360,
        "east": (orientation_deg + 270) % 360,
    }

    for wall, wall_az in wall_azimuths.items():
        result[wall] = incident_solar_on_surface(
            ghi, altitude_deg, azimuth_deg,
            surface_tilt_deg=90.0,  # Vertical wall
            surface_azimuth_deg=wall_az,
            dni=dni, dhi=dhi
        )

    # Roof (horizontal or tilted)
    result["roof"] = incident_solar_on_surface(
        ghi, altitude_deg, azimuth_deg,
        surface_tilt_deg=0.0,  # Horizontal for flat roof
        surface_azimuth_deg=orientation_deg,
        dni=dni, dhi=dhi
    )

    return result
