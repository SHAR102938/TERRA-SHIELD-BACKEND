def calculate_bukhari_fuel(heating_energy_kwh: float) -> dict:
    """
    Calculates the fuel consumption (kerosene) for a traditional Bukhari heater.
    
    Assumptions:
    - Fuel: Kerosene
    - Energy Density of Kerosene: ~10 kWh/liter
    - Bukhari Thermal Efficiency: ~60%
    - Effective Heat per Liter: 6.0 kWh
    - Kerosene Density: 0.81 kg/liter
    """
    if heating_energy_kwh <= 0:
        return {
            "kerosene_liters": 0.0,
            "kerosene_kg": 0.0,
        }
        
    effective_heat_per_liter = 6.0 # kWh
    liters = heating_energy_kwh / effective_heat_per_liter
    
    return {
        "kerosene_liters": round(liters, 2),
        "kerosene_kg": round(liters * 0.81, 2),
    }
