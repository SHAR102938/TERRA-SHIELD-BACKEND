"""
Bukhari & Military Fuel Consumption Model
=========================================
Implements kerosene fuel calculations, military logistics/convoy metrics,
and operational Carbon Monoxide (CO) risk representation for SIH26051.

Assumptions & Standards:
- Fuel: Aviation Turbine Fuel / Kerosene (ATF/K-50) used in high-altitude posts.
- Energy density of Kerosene: 10.0 kWh/liter (LHV ≈ 43.1 MJ/kg, density ≈ 0.81 kg/L).
- Bukhari thermal efficiency: ~60% (DRDO Him-Tapak improved design).
- Effective thermal energy delivered per liter: 6.0 kWh/liter.
- Military logistics:
    - 1 Standard Army Fuel Drum = 200 Liters.
    - 1 Army 4x4 High-Altitude Convoy Truck (ALS 2.5T / 5T) = 25 Drums (5,000 Liters).
- CO Risk Metric: Operational indicator (0–100) based on fuel burned per operating hour
  normalized against ventilation rate (air changes per hour).
"""

from typing import Dict, Any, Optional


def calculate_bukhari_fuel(
    heating_energy_kwh: float,
    baseline_heating_kwh: Optional[float] = None,
    burn_hours: float = 72.0,
    ach: float = 0.5,
) -> Dict[str, Any]:
    """
    Calculates fuel consumption, logistics savings, and operational CO risk.
    """
    effective_kwh_per_liter = 6.0  # 10.0 kWh/L * 60% efficiency
    kerosene_density_kg_per_l = 0.81

    if heating_energy_kwh <= 0:
        return {
            "kerosene_liters": 0.0,
            "kerosene_kg": 0.0,
            "fuel_cost_inr": 0.0,
            "liters_saved_vs_baseline": 0.0,
            "percentage_fuel_reduction": 0.0,
            "convoy_drums_saved": 0.0,
            "convoy_trucks_saved": 0.0,
            "co_risk_score": 0.0,
            "co_risk_level": "NEGLIGIBLE",
            "co_risk_description": "Passive shelter maintains comfort without active combustion.",
        }

    liters = heating_energy_kwh / effective_kwh_per_liter
    kg = liters * kerosene_density_kg_per_l
    
    # Subsidized military remote logistics kerosene cost estimated at ₹85/L delivered
    cost_inr = liters * 85.0

    # Baseline comparison (if not provided, compare against standard uninsulated stone shelter)
    if baseline_heating_kwh is None or baseline_heating_kwh <= heating_energy_kwh:
        baseline_kwh = heating_energy_kwh * 2.2  # Uninsulated baseline burns 2.2x more
    else:
        baseline_kwh = baseline_heating_kwh

    baseline_liters = baseline_kwh / effective_kwh_per_liter
    liters_saved = max(0.0, baseline_liters - liters)
    reduction_pct = (liters_saved / baseline_liters) * 100.0 if baseline_liters > 0 else 0.0

    # Convoy impact
    drums_saved = liters_saved / 200.0
    trucks_saved = liters_saved / 5000.0

    # Operational CO Risk Score (0 - 100)
    # Higher fuel burned per hour in low-ventilation spaces increases CO accumulation risk
    hourly_burn_rate = liters / max(1.0, burn_hours)
    ventilation_factor = max(0.2, ach)
    raw_co_index = (hourly_burn_rate / ventilation_factor) * 35.0
    co_score = round(max(5.0, min(100.0, raw_co_index)), 1)

    if co_score < 30.0:
        co_level = "LOW"
        co_desc = "Low heater usage; ventilation adequate to prevent hazardous CO buildup."
    elif co_score < 60.0:
        co_level = "MODERATE"
        co_desc = "Standard Bukhari operation; periodic flue inspection and ventilation required."
    elif co_score < 80.0:
        co_level = "HIGH"
        co_desc = "Substantial combustion load; mandatory dual CO monitors and designated chimney draft."
    else:
        co_level = "CRITICAL"
        co_desc = "Severe combustion accumulation in restricted airflow; extreme asphyxiation/backblast risk."

    return {
        "kerosene_liters": round(liters, 2),
        "kerosene_kg": round(kg, 2),
        "fuel_cost_inr": round(cost_inr, 2),
        "liters_saved_vs_baseline": round(liters_saved, 2),
        "percentage_fuel_reduction": round(reduction_pct, 1),
        "convoy_drums_saved": round(drums_saved, 2),
        "convoy_trucks_saved": round(trucks_saved, 3),
        "co_risk_score": co_score,
        "co_risk_level": co_level,
        "co_risk_description": co_desc,
    }
