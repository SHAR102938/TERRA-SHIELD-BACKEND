"""
Lumped-parameter RC (Resistance-Capacitance) thermal network transient solver.

Implements a simplified building thermal model:
  - Single-zone air node
  - Wall/roof/floor nodes with thermal mass
  - External boundary conditions (outdoor temp, solar, wind)
  - Internal gains (occupants, equipment)
  - Ventilation/infiltration losses
  - Optional HVAC (heating/cooling to maintain setpoint)

Solver: Explicit Euler with configurable timestep.
"""

from __future__ import annotations

import math
import numpy as np
from datetime import datetime

from thermashell_engine.types import (
    SimulationConfig, SimulationResult, HeatBalanceBreakdown, ComfortMetrics
)
from thermashell_engine.conduction import (
    compute_u_value, compute_r_value, thermal_capacity_per_area
)
from thermashell_engine.convection import (
    exterior_convection_coefficient, interior_convection_coefficient,
    wind_speed_at_height
)
from thermashell_engine.radiation import (
    sky_temperature, longwave_radiation_heat, solar_absorption,
    solar_gain_through_window
)
from thermashell_engine.solar import (
    compute_solar_position, solar_irradiance_on_walls
)
from thermashell_engine.ventilation import total_ventilation_heat_loss
from thermashell_engine.comfort import compute_comfort_metrics, operative_temperature


def run_simulation(config: SimulationConfig) -> SimulationResult:
    """
    Execute a transient thermal simulation using the RC network method.

    The model treats the building as a single thermal zone with:
      - A lumped air node (low thermal mass)
      - Lumped wall/roof/floor nodes (thermal mass from envelope)
      - Boundary conditions from climate timeseries

    Energy balance at the air node (per timestep):
        C_air * dT/dt = Q_walls + Q_roof + Q_floor + Q_windows + Q_solar
                       + Q_internal + Q_ventilation + Q_hvac

    Args:
        config: Complete simulation configuration

    Returns:
        SimulationResult with timeseries and aggregate metrics
    """
    geo = config.geometry
    env = config.envelope
    clim = config.climate
    dt_s = config.timestep_s
    n_steps = clim.n_hours

    # ── Precompute geometry areas ────────────────────────────────────────
    total_wall_perimeter = 2 * (geo.length + geo.width)
    gross_wall_area = total_wall_perimeter * geo.height
    total_opening_area = sum(o.area for o in env.openings)
    net_wall_area = max(0, gross_wall_area - total_opening_area)
    roof_area = geo.roof_area
    floor_area = geo.floor_area
    volume = geo.volume

    # ── Compute thermal parameters ──────────────────────────────────────
    u_wall = compute_u_value(env.walls, "wall")
    u_roof = compute_u_value(env.roof, "roof")
    u_floor = compute_u_value(env.floor, "floor")

    # Thermal capacitance (J/K)
    c_wall = thermal_capacity_per_area(env.walls) * net_wall_area
    c_roof = thermal_capacity_per_area(env.roof) * roof_area
    c_air = 1.225 * 1005 * volume  # ρ * cp * V

    # Combined capacitance (simplified: air node carries all thermal mass)
    # In this 1R1C model, we lump wall/roof thermal mass into the air node
    # This is a simplification — a 2R2C model would be more accurate
    C_total = c_air + 0.5 * c_wall + 0.5 * c_roof  # Interior half of mass

    # ── Opening properties ──────────────────────────────────────────────
    openings_by_face: dict[str, list] = {"north": [], "south": [], "east": [], "west": []}
    for opening in env.openings:
        face = opening.wall_face.lower()
        if face in openings_by_face:
            openings_by_face[face].append(opening)

    # ── Initialize result arrays ────────────────────────────────────────
    indoor_temps = np.zeros(n_steps)
    op_temps = np.zeros(n_steps)
    wall_inner_temps = np.zeros(n_steps)
    wall_outer_temps = np.zeros(n_steps)
    roof_inner_temps = np.zeros(n_steps)
    q_cond_walls = np.zeros(n_steps)
    q_cond_roof = np.zeros(n_steps)
    q_cond_floor = np.zeros(n_steps)
    q_solar = np.zeros(n_steps)
    q_vent = np.zeros(n_steps)
    q_internal = np.zeros(n_steps)
    q_hvac = np.zeros(n_steps)

    # Initial indoor temperature — start at outdoor temp or target
    t_indoor = config.target_temp_c
    t_wall = t_indoor  # Wall node temperature

    # ── Heat balance accumulators (for energy totals) ───────────────────
    total_cond_walls = 0.0
    total_cond_roof = 0.0
    total_cond_floor = 0.0
    total_cond_windows = 0.0
    total_solar = 0.0
    total_internal = 0.0
    total_vent = 0.0
    total_infiltration = 0.0
    total_heating = 0.0
    total_cooling = 0.0
    peak_heating = 0.0
    peak_cooling = 0.0

    # ── Time loop ───────────────────────────────────────────────────────
    for i in range(n_steps):
        t_out = clim.temperature_c[i]
        rh = clim.relative_humidity[i] if i < len(clim.relative_humidity) else 50.0
        wind = clim.wind_speed_ms[i] if i < len(clim.wind_speed_ms) else 2.0
        ghi = clim.solar_ghi[i] if i < len(clim.solar_ghi) else 0.0

        dni = clim.solar_dni[i] if clim.solar_dni and i < len(clim.solar_dni) else None
        dhi = clim.solar_dhi[i] if clim.solar_dhi and i < len(clim.solar_dhi) else None

        # Parse timestamp for solar position
        try:
            ts = datetime.fromisoformat(clim.timestamps[i].replace("Z", "+00:00"))
        except (ValueError, IndexError):
            # Fallback: assume hourly from midnight
            ts = datetime(2024, 1, 15, i % 24, 0, 0)

        # ── Solar radiation ─────────────────────────────────────────────
        latitude = 34.15  # Default Leh — will be parameterized later
        longitude = 77.58
        alt, az = compute_solar_position(latitude, longitude, ts)

        wall_solar = solar_irradiance_on_walls(
            ghi, alt, az, geo.orientation_deg, dni, dhi
        )

        # Solar gain through windows
        q_solar_gain = 0.0
        for face, openings in openings_by_face.items():
            solar_on_face = wall_solar.get(face, 0.0)
            for op in openings:
                q_solar_gain += solar_gain_through_window(solar_on_face, op.shgc, op.area)

        # Solar gain on opaque walls (absorbed, then conducted inward)
        q_solar_opaque = 0.0
        absorptivity = 0.6  # Typical medium-color wall
        for face in ["north", "south", "east", "west"]:
            face_area = geo.length * geo.height if face in ["east", "west"] else geo.width * geo.height
            # Deduct openings on this face
            face_opening_area = sum(o.area for o in openings_by_face.get(face, []))
            opaque_area = max(0, face_area - face_opening_area)
            q_solar_opaque += solar_absorption(wall_solar.get(face, 0.0), absorptivity, opaque_area)

        # Roof solar absorption
        q_solar_roof = solar_absorption(wall_solar.get("roof", 0.0), absorptivity, roof_area)

        # Total solar into zone: window direct solar gain + inward conduction of opaque surface solar absorption
        # Per sol-air theory, inward fraction = U / h_exterior ≈ U * R_se (typically 1-5% for insulated envelopes)
        inward_frac_wall = min(0.15, u_wall * 0.04)
        inward_frac_roof = min(0.15, u_roof * 0.04)
        q_solar_total = q_solar_gain + (inward_frac_wall * q_solar_opaque + inward_frac_roof * q_solar_roof)

        # ── Conduction losses ───────────────────────────────────────────
        q_walls = u_wall * net_wall_area * (t_indoor - t_out)
        q_roof_cond = u_roof * roof_area * (t_indoor - t_out)
        q_floor_cond = u_floor * floor_area * (t_indoor - 10.0)  # Ground temp ≈ 10°C
        q_windows = sum(
            o.u_value * o.area * (t_indoor - t_out)
            for openings in openings_by_face.values()
            for o in openings
        )

        # ── Ventilation losses ──────────────────────────────────────────
        q_ventilation = total_ventilation_heat_loss(
            t_indoor, t_out,
            config.ach_natural, config.ach_infiltration,
            volume, geo.elevation_m
        )

        # ── Internal gains ──────────────────────────────────────────────
        q_internal_gain = (config.occupants * config.metabolic_rate_w +
                           config.internal_gains_w)

        # ── Net heat balance ────────────────────────────────────────────
        q_net = (q_solar_total + q_internal_gain -
                 q_walls - q_roof_cond - q_floor_cond - q_windows -
                 q_ventilation)

        # ── HVAC ────────────────────────────────────────────────────────
        q_hvac_step = 0.0
        if config.hvac_mode != "free_running":
            t_lower = config.target_temp_c - config.comfort_band_c
            t_upper = config.target_temp_c + config.comfort_band_c

            # Predict next temperature without HVAC
            t_next_free = t_indoor + (q_net / C_total) * dt_s

            if config.hvac_mode in ("heated", "mixed") and t_next_free < t_lower:
                # Heating needed: compute power to maintain lower setpoint
                q_hvac_step = C_total * (t_lower - t_next_free) / dt_s
                total_heating += q_hvac_step * dt_s / 3600.0  # Wh
                peak_heating = max(peak_heating, q_hvac_step)

            elif config.hvac_mode in ("cooled", "mixed") and t_next_free > t_upper:
                # Cooling needed
                q_hvac_step = C_total * (t_upper - t_next_free) / dt_s  # Negative
                total_cooling += abs(q_hvac_step) * dt_s / 3600.0
                peak_cooling = max(peak_cooling, abs(q_hvac_step))

        # ── Update indoor temperature (Explicit Euler) ──────────────────
        q_total = q_net + q_hvac_step
        t_indoor = t_indoor + (q_total / C_total) * dt_s

        # ── Estimate surface temperatures ───────────────────────────────
        r_wall = compute_r_value(env.walls, "wall")
        t_wall_inner = t_indoor - (q_walls / net_wall_area if net_wall_area > 0 else 0) * 0.13
        t_wall_outer = t_out + (q_walls / net_wall_area if net_wall_area > 0 else 0) * 0.04

        r_roof = compute_r_value(env.roof, "roof")
        t_roof_inner = t_indoor - (q_roof_cond / roof_area if roof_area > 0 else 0) * 0.10

        # ── Store results ───────────────────────────────────────────────
        indoor_temps[i] = round(t_indoor, 3)
        op_temps[i] = round(operative_temperature(t_indoor, t_wall_inner), 3)
        wall_inner_temps[i] = round(t_wall_inner, 3)
        wall_outer_temps[i] = round(t_wall_outer, 3)
        roof_inner_temps[i] = round(t_roof_inner, 3)
        q_cond_walls[i] = round(q_walls, 2)
        q_cond_roof[i] = round(q_roof_cond, 2)
        q_cond_floor[i] = round(q_floor_cond, 2)
        q_solar[i] = round(q_solar_total, 2)
        q_vent[i] = round(q_ventilation, 2)
        q_internal[i] = round(q_internal_gain, 2)
        q_hvac[i] = round(q_hvac_step, 2)

        # Accumulate energy totals (Wh → kWh at the end)
        total_cond_walls += q_walls * dt_s / 3600.0
        total_cond_roof += q_roof_cond * dt_s / 3600.0
        total_cond_floor += q_floor_cond * dt_s / 3600.0
        total_cond_windows += q_windows * dt_s / 3600.0
        total_solar += q_solar_total * dt_s / 3600.0
        total_internal += q_internal_gain * dt_s / 3600.0
        total_vent += q_ventilation * dt_s / 3600.0

    # ── Aggregate results ───────────────────────────────────────────────
    outdoor_temps = clim.temperature_c[:n_steps]

    comfort = compute_comfort_metrics(
        indoor_temps.tolist(), outdoor_temps,
        config.target_temp_c, config.comfort_band_c
    )

    heat_balance = HeatBalanceBreakdown(
        conduction_walls_kwh=round(total_cond_walls / 1000, 3),
        conduction_roof_kwh=round(total_cond_roof / 1000, 3),
        conduction_floor_kwh=round(total_cond_floor / 1000, 3),
        conduction_windows_kwh=round(total_cond_windows / 1000, 3),
        solar_gain_kwh=round(total_solar / 1000, 3),
        internal_gain_kwh=round(total_internal / 1000, 3),
        ventilation_kwh=round(total_vent / 1000, 3),
        infiltration_kwh=0.0,  # Already included in ventilation
        heating_energy_kwh=round(total_heating / 1000, 3),
        cooling_energy_kwh=round(total_cooling / 1000, 3),
    )

    comfort_metrics = ComfortMetrics(
        pmv_mean=round(comfort["pmv_mean"], 2),
        ppd_mean=round(comfort["ppd_mean"], 1),
        comfort_hours=comfort["comfort_hours"],
        total_hours=comfort["total_hours"],
        comfort_percentage=comfort["comfort_percentage"],
        operative_temp_mean_c=comfort["operative_temp_mean_c"],
        hours_below_comfort=comfort["hours_below_comfort"],
        hours_above_comfort=comfort["hours_above_comfort"],
    )

    return SimulationResult(
        timestamps=clim.timestamps[:n_steps],
        indoor_temp_c=indoor_temps.tolist(),
        outdoor_temp_c=outdoor_temps,
        operative_temp_c=op_temps.tolist(),
        wall_inner_surface_temp_c=wall_inner_temps.tolist(),
        wall_outer_surface_temp_c=wall_outer_temps.tolist(),
        roof_inner_surface_temp_c=roof_inner_temps.tolist(),
        q_conduction_walls=q_cond_walls.tolist(),
        q_conduction_roof=q_cond_roof.tolist(),
        q_conduction_floor=q_cond_floor.tolist(),
        q_solar_gain=q_solar.tolist(),
        q_ventilation=q_vent.tolist(),
        q_internal=q_internal.tolist(),
        q_hvac=q_hvac.tolist(),
        heat_balance=heat_balance,
        comfort=comfort_metrics,
        simulation_hours=n_steps,
        timestep_s=dt_s,
        peak_heating_load_w=round(peak_heating, 1),
        peak_cooling_load_w=round(peak_cooling, 1),
    )
