
import math
import numpy as np

# Constants
STEFAN_BOLTZMANN = 5.67e-8  # W/m^2K^4
AIR_DENSITY = 1.225  # kg/m^3
AIR_SPECIFIC_HEAT = 1005  # J/kgK

def run_thermal_simulation(
    geometry: dict,
    material: dict,
    climate: dict,
    operating_conditions: dict,
    simulation_params: dict,
):
    """
    Runs a transient thermal simulation for a shelter.
    """
    # --- 1. Unpack inputs and validate ---
    try:
        # Geometry
        wall_area = geometry["wall_area"]
        roof_area = geometry["roof_area"]
        floor_area = geometry["floor_area"]
        volume = geometry["volume"]

        # Material
        k = material["thermal_conductivity"]
        density = material["density"]
        specific_heat = material["specific_heat"]
        thickness = material["thickness"]
        solar_absorptivity = material["solar_absorptivity"]
        emissivity = material["emissivity"]

        # Climate
        initial_outdoor_temp = climate["temperature"]
        solar_radiation = climate["solar_radiation"]
        wind_speed = climate["wind_speed"]

        # Operating Conditions
        initial_indoor_temp = operating_conditions["initial_indoor_temperature"]
        occupants = operating_conditions["occupants"]
        heat_per_person = operating_conditions["heat_per_person"]
        ach = operating_conditions["air_changes_per_hour"]

        # Simulation
        duration_hours = simulation_params["duration_hours"]
        timestep_hours = simulation_params["timestep_hours"]
        
    except KeyError as e:
        raise ValueError(f"Missing required input parameter: {e}")

    if any(v <= 0 for v in [k, density, specific_heat, thickness, volume, duration_hours, timestep_hours]):
        raise ValueError("Material properties, volume, and simulation times must be positive.")

    # --- 2. Calculate Thermal Properties ---
    # Thermal Resistance (R-value) and Transmittance (U-value)
    r_value = thickness / k
    u_value = 1 / r_value if r_value > 0 else float('inf')

    # Thermal Mass (Capacitance)
    wall_volume = wall_area * thickness
    roof_volume = roof_area * thickness
    wall_mass = wall_volume * density
    roof_mass = roof_volume * density
    wall_capacitance = wall_mass * specific_heat
    roof_capacitance = roof_mass * specific_heat
    # Effective indoor air capacitance
    air_mass = volume * AIR_DENSITY
    air_capacitance = air_mass * AIR_SPECIFIC_HEAT

    # Convection coefficients (simplified)
    h_conv_external = 5.8 + 3.94 * wind_speed  # Empirical formula for external convection
    h_conv_internal = 3.0  # Assumed for internal still air

    # --- 3. Initialize Simulation State ---
    dt_seconds = timestep_hours * 3600
    num_timesteps = int(duration_hours / timestep_hours)
    time_series = []

    # Temperatures (Kelvin for calculation, Celsius for storage)
    T_indoor_C = initial_indoor_temp
    T_wall_C = initial_indoor_temp
    T_roof_C = initial_indoor_temp

    # Outdoor temperature profile (sinusoidal approximation)
    # This creates a simple day/night cycle around the mean temperature
    T_outdoor_mean_C = initial_outdoor_temp
    T_amplitude_C = 5.0  # Assume a 5°C swing
    outdoor_temp_profile = [
        T_outdoor_mean_C + T_amplitude_C * math.sin(2 * math.pi * (i * timestep_hours) / 24)
        for i in range(num_timesteps)
    ]
    
    # --- 4. Simulation Loop ---
    for i in range(num_timesteps):
        hour = (i + 1) * timestep_hours
        T_outdoor_C = outdoor_temp_profile[i]

        # Convert current temperatures to Kelvin for radiation calculations
        T_indoor_K = T_indoor_C + 273.15
        T_wall_K = T_wall_C + 273.15
        T_roof_K = T_roof_C + 273.15
        T_outdoor_K = T_outdoor_C + 273.15
        T_sky_K = T_outdoor_K - 6 # Simplified sky temperature for radiation loss

        # --- Calculate Heat Flows (Watts) ---
        
        # Solar Gain (simplified, assumes constant radiation over the period)
        # A better model would vary this with time of day
        q_solar_roof = solar_radiation * roof_area * solar_absorptivity
        q_solar_wall = solar_radiation * (wall_area / 2) * solar_absorptivity # Simplified exposed area
        q_solar_total = q_solar_roof + q_solar_wall

        # Internal Heat Gain
        q_internal = occupants * heat_per_person

        # Ventilation Heat Loss
        volumetric_flow_rate = (ach * volume) / 3600  # m^3/s
        mass_flow_rate = volumetric_flow_rate * AIR_DENSITY
        q_ventilation = mass_flow_rate * AIR_SPECIFIC_HEAT * (T_indoor_C - T_outdoor_C)

        # --- Heat transfer for Wall ---
        # Convection (outdoor air to outer wall surface)
        q_conv_ext_wall = h_conv_external * wall_area * (T_outdoor_C - T_wall_C)
        # Radiation (outer wall surface to sky)
        q_rad_ext_wall = emissivity * STEFAN_BOLTZMANN * wall_area * (T_wall_K**4 - T_sky_K**4)
        # Conduction (through the wall - from wall mass to indoor air)
        q_cond_wall = u_value * wall_area * (T_wall_C - T_indoor_C)
        
        # Net energy change for the wall mass
        q_net_wall = q_conv_ext_wall - q_rad_ext_wall - q_cond_wall + q_solar_wall
        
        # --- Heat transfer for Roof ---
        q_conv_ext_roof = h_conv_external * roof_area * (T_outdoor_C - T_roof_C)
        q_rad_ext_roof = emissivity * STEFAN_BOLTZMANN * roof_area * (T_roof_K**4 - T_sky_K**4)
        q_cond_roof = u_value * roof_area * (T_roof_C - T_indoor_C)
        q_net_roof = q_conv_ext_roof - q_rad_ext_roof - q_cond_roof + q_solar_roof

        # --- Net energy change for Indoor Air ---
        q_net_indoor = q_cond_wall + q_cond_roof + q_internal - q_ventilation

        # --- 5. Update Temperatures for Next Timestep ---
        if wall_capacitance > 0:
            delta_T_wall = (q_net_wall * dt_seconds) / wall_capacitance
            T_wall_C += delta_T_wall
        
        if roof_capacitance > 0:
            delta_T_roof = (q_net_roof * dt_seconds) / roof_capacitance
            T_roof_C += delta_T_roof

        if air_capacitance > 0:
            delta_T_indoor = (q_net_indoor * dt_seconds) / air_capacitance
            T_indoor_C += delta_T_indoor

        # Store results for this timestep
        time_series.append({
            "hour": hour,
            "outdoor_temperature": T_outdoor_C,
            "wall_temperature": T_wall_C,
            "roof_temperature": T_roof_C,
            "indoor_temperature": T_indoor_C,
            "solar_gain": q_solar_total,
            "conduction_loss": - (q_cond_wall + q_cond_roof), # Loss is positive
            "ventilation_loss": q_ventilation,
            "internal_heat_gain": q_internal,
        })

    return time_series