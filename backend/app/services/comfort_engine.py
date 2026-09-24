
def calculate_comfort_score(
    time_series: list,
    target_temperature: float,
    comfort_band: float,
):
    """
    Calculates a comfort score based on the results of a thermal simulation.
    """
    if not time_series:
        return {
            "score": 0,
            "classification": "Not Suitable",
            "percentage_time_in_comfort_range": 0,
            "average_temperature_deviation": float('inf'),
        }

    num_timesteps = len(time_series)
    comfort_lower_bound = target_temperature - comfort_band
    comfort_upper_bound = target_temperature + comfort_band

    timesteps_in_comfort = 0
    total_deviation = 0

    indoor_temperatures = [step["indoor_temperature"] for step in time_series]

    for temp in indoor_temperatures:
        if comfort_lower_bound <= temp <= comfort_upper_bound:
            timesteps_in_comfort += 1
        
        total_deviation += abs(temp - target_temperature)

    # 1. Percentage of time in comfort range
    percentage_in_comfort = (timesteps_in_comfort / num_timesteps) * 100

    # 2. Average deviation from target
    average_deviation = total_deviation / num_timesteps

    # --- Comfort Score Formula ---
    # This is a weighted formula.
    # 70% of the score is from the percentage of time spent in the comfort range.
    # 30% is a penalty based on the average deviation. A larger deviation results in a bigger penalty.
    
    # Deviation penalty: 0 for 0 deviation, max penalty of 30 for 5+ degrees deviation
    deviation_penalty = min(30, average_deviation * 6)
    
    comfort_score = max(0, percentage_in_comfort * 0.7 - deviation_penalty)
    
    # Clamp score to 0-100 range
    comfort_score = max(0, min(100, comfort_score))


    # --- Suitability Classification ---
    if comfort_score >= 75:
        classification = "Suitable"
    elif 50 <= comfort_score < 75:
        classification = "Marginal"
    else:
        classification = "Not Suitable"

    return {
        "score": comfort_score,
        "classification": classification,
        "percentage_time_in_comfort_range": percentage_in_comfort,
        "average_temperature_deviation": average_deviation,
    }

def summarize_simulation_results(time_series: list):
    """
    Calculates summary statistics from the simulation time series.
    """
    if not time_series:
        return {}

    indoor_temps = [s["indoor_temperature"] for s in time_series]
    wall_temps = [s["wall_temperature"] for s in time_series]
    roof_temps = [s["roof_temperature"] for s in time_series]

    summary = {
        "min_indoor_temperature": min(indoor_temps),
        "max_indoor_temperature": max(indoor_temps),
        "average_indoor_temperature": sum(indoor_temps) / len(indoor_temps),
        "final_indoor_temperature": indoor_temps[-1],
        "min_wall_temperature": min(wall_temps),
        "max_wall_temperature": max(wall_temps),
        "min_roof_temperature": min(roof_temps),
        "max_roof_temperature": max(roof_temps),
        "total_conduction_loss": sum(s.get("conduction_loss", 0) for s in time_series),
        "total_solar_gain": sum(s.get("solar_gain", 0) for s in time_series),
        "total_internal_heat_gain": sum(s.get("internal_heat_gain", 0) for s in time_series),
        "total_ventilation_loss": sum(s.get("ventilation_loss", 0) for s in time_series),
    }
    return summary