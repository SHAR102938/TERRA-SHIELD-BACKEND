import math
from thermashell_engine.types import (
    SimulationConfig, ShelterGeometry, Envelope, WallAssembly,
    MaterialLayer, ClimateTimeseries, RoofType, HVACMode
)
from thermashell_engine.rc_network import run_simulation
from datetime import datetime, timedelta

def run_thermal_simulation(
    geometry: dict,
    material: dict,
    climate: dict,
    operating_conditions: dict,
    simulation_params: dict,
):
    """
    Bridge from the classic API to the v1 RC network engine.
    """
    duration_hours = simulation_params.get("duration_hours", 72)
    timestep_hours = simulation_params.get("timestep_hours", 1.0)
    num_timesteps = int(duration_hours / timestep_hours)
    
    # 1. Geometry
    # The classic geometry passed in is often just calculated outputs, but we need the inputs for ShelterGeometry
    # If we don't have them, we must infer or use defaults.
    # The new optimization route passes them. The classic geometry route passes them.
    # Let's extract length, width, height, roof_pitch if available, else reverse engineer or use defaults.
    length = geometry.get("length", 6.0) # default if not passed
    width = geometry.get("width", 4.0)
    height = geometry.get("height", 3.0)
    roof_pitch = geometry.get("roof_pitch", 15.0)
    
    # Actually, geometry in classic thermal_engine is usually the dict from geometry_engine.py
    # geometry_engine.py output does NOT include length/width/height/roof_pitch natively!
    # Wait, in analysis.py: geometry_values = calculate_geometry(length, width, height, roof_pitch)
    # The returned dict has floor_area, wall_area, roof_area, envelope_area, roof_slope, roof_rise, total_height, volume
    # So we don't have length/width/height unless we inject it!
    # BUT wait, the bridge can just use a reverse approximation or we can modify geometry_engine to return length/width/height.
    # We already modified geometry_engine. Let's make sure it returns them.
    # I will edit geometry_engine to return length, width, height, roof_pitch.
    length = geometry.get("length", math.sqrt(geometry.get("floor_area", 24)))
    width = geometry.get("width", geometry.get("floor_area", 24) / length)
    height = geometry.get("height", 3.0)
    roof_pitch = geometry.get("roof_pitch", 15.0)
    
    geo = ShelterGeometry(
        length=length,
        width=width,
        height=height,
        roof_type=RoofType.GABLE if roof_pitch > 0 else RoofType.FLAT,
        roof_pitch_deg=roof_pitch,
        orientation_deg=180.0,
    )
    
    # 2. Material/Envelope
    thickness = material["thickness"]
    # Ensure it's a valid material layer
    layer = MaterialLayer(
        name=material.get("name", "Unknown Material"),
        thickness_m=thickness,
        conductivity=material["thermal_conductivity"],
        density=material["density"],
        specific_heat=material["specific_heat"],
    )
    assembly = WallAssembly(name="Single Layer", layers=[layer])
    # The old classic engine didn't have separate roof/floor or windows.
    # We'll use the same assembly for all, and no windows for compatibility.
    env = Envelope(walls=assembly, roof=assembly, floor=assembly, openings=[])

    # 3. Climate
    base_temp = climate["temperature"]
    amplitude = climate.get("temperature_amplitude", 5.0)
    ghi_base = climate.get("solar_radiation", 0.0)
    wind_speed = climate.get("wind_speed", 2.0)
    
    start_dt = datetime(2024, 1, 15, 0, 0, 0)
    timestamps = []
    temps = []
    ghis = []
    winds = []
    rhs = []
    
    for i in range(num_timesteps):
        t = start_dt + timedelta(hours=i * timestep_hours)
        timestamps.append(t.isoformat() + "Z")
        # Reproduce the v1 sinusoidal pattern or the classic one
        # V1 pattern: sin(2*pi*h/24 - pi/2)
        temps.append(base_temp + amplitude * math.sin(2 * math.pi * i * timestep_hours / 24 - math.pi / 2))
        winds.append(wind_speed)
        rhs.append(50.0)
        
        # Solar pattern matching v1
        hr = (i * timestep_hours) % 24
        if 6 <= hr <= 18:
            ghi = ghi_base * math.sin(math.pi * (hr - 6) / 12)
        else:
            ghi = 0.0
        ghis.append(max(0.0, ghi))
        
    climate_ts = ClimateTimeseries(
        timestamps=timestamps,
        temperature_c=temps,
        relative_humidity=rhs,
        wind_speed_ms=winds,
        solar_ghi=ghis,
    )

    # 4. Operating Conditions
    occ = operating_conditions.get("occupants", 0)
    hpp = operating_conditions.get("heat_per_person", 0)
    ach = operating_conditions.get("air_changes_per_hour", 0.0)
    target_temp = operating_conditions.get("target_temperature", 18.0)
    
    cfg = SimulationConfig(
        geometry=geo,
        envelope=env,
        climate=climate_ts,
        occupants=occ,
        metabolic_rate_w=hpp,
        internal_gains_w=0.0,
        target_temp_c=target_temp,
        comfort_band_c=2.0,
        hvac_mode=HVACMode.FREE_RUNNING,
        ach_natural=ach,
        ach_infiltration=0.0,
        timestep_s=int(timestep_hours * 3600),
    )
    
    # 5. Run simulation
    result = run_simulation(cfg)
    
    # 6. Reformat to classic list-of-dicts
    time_series = []
    for i in range(num_timesteps):
        hour_val = (i + 1) * timestep_hours
        time_series.append({
            "hour": hour_val,
            "outdoor_temperature": result.outdoor_temp_c[i],
            "wall_temperature": result.wall_inner_surface_temp_c[i],
            "roof_temperature": result.roof_inner_surface_temp_c[i],
            "indoor_temperature": result.indoor_temp_c[i],
            "solar_gain": result.q_solar_gain[i],
            "conduction_loss": (result.q_conduction_walls[i] + result.q_conduction_roof[i] + result.q_conduction_floor[i]),
            "conduction_walls_loss": result.q_conduction_walls[i],
            "conduction_roof_loss": result.q_conduction_roof[i],
            "conduction_floor_loss": result.q_conduction_floor[i],
            "ventilation_loss": result.q_ventilation[i],
            "internal_heat_gain": result.q_internal[i],
            "pmv": result.pmv[i] if result.pmv else 0.0,
            "ppd": result.ppd[i] if result.ppd else 0.0,
            "heating_load_w": result.q_hvac_heating[i],
            "cooling_load_w": result.q_hvac_cooling[i],
        })
        
    return time_series