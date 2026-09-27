"""
Retrofit Advisory Engine
========================
Evaluates and ranks discrete thermal interventions for existing shelters (SIH26051).

Takes an existing uninsulated or poorly performing shelter and tests realistic,
defensible upgrades (insulation, air sealing, storm glazing, Trombe solar passive wall).
Computes exact capital cost (₹), thermal comfort gain, kerosene saved, and payback period.
"""

from typing import Dict, Any, List
from app.services.geometry_engine import calculate_geometry
from app.services.thermal_engine import run_thermal_simulation
from app.services.comfort_engine import calculate_comfort_score, summarize_simulation_results
from app.services.fuel_model import calculate_bukhari_fuel
from app.data.materials import get_material_by_id, get_all_materials


# Baseline & upgrade intervention catalog
INTERVENTIONS = [
    {
        "id": "air_sealing",
        "name": "Airtightness & Weatherstripping Package",
        "category": "Infiltration Control",
        "description": "EPDM gaskets on doors/windows, silicone caulking on joints, backdraft dampers on exhaust.",
        "ach_multiplier": 0.35,  # Reduces ACH significantly (e.g. 1.2 -> 0.42)
        "thickness_add_m": 0.0,
        "k_eff": None,
        "solar_boost": 1.0,
        "cost_inr_flat": 14000.0,
        "cost_inr_per_m2": 0.0,
        "weight_add_kg": 8.0,
        "implementation_days": 1,
    },
    {
        "id": "eps_50mm",
        "name": "50mm Exterior EPS Insulation",
        "category": "Envelope Insulation",
        "description": "Expanded polystyrene boards fixed to exterior walls with weather-resistant render.",
        "ach_multiplier": 0.8,
        "thickness_add_m": 0.05,
        "k_eff": 0.036,
        "solar_boost": 1.0,
        "cost_inr_flat": 0.0,
        "cost_inr_per_m2": 450.0,
        "weight_add_kg_per_m2": 2.5,
        "implementation_days": 3,
    },
    {
        "id": "rockwool_100mm",
        "name": "100mm Exterior Mineral Rockwool",
        "category": "High-Performance Insulation",
        "description": "Non-combustible A1 fire-rated rockwool boards with vapor-permeable water barrier.",
        "ach_multiplier": 0.7,
        "thickness_add_m": 0.10,
        "k_eff": 0.034,
        "solar_boost": 1.0,
        "cost_inr_flat": 0.0,
        "cost_inr_per_m2": 850.0,
        "weight_add_kg_per_m2": 10.0,
        "implementation_days": 4,
    },
    {
        "id": "secondary_glazing",
        "name": "Polycarbonate Secondary Storm Glazing",
        "category": "Window Upgrade",
        "description": "10mm multi-wall UV-stabilized polycarbonate storm panels installed over existing windows.",
        "ach_multiplier": 0.75,
        "thickness_add_m": 0.0,
        "k_eff": None,
        "solar_boost": 1.1,
        "cost_inr_flat": 18000.0,
        "cost_inr_per_m2": 0.0,
        "weight_add_kg": 15.0,
        "implementation_days": 1,
    },
    {
        "id": "trombe_wall",
        "name": "South-Facing Solar Trombe Wall Glazing",
        "category": "Passive Solar",
        "description": "Glazed air cavity mounted to dark south-facing stone masonry for daytime solar storage and night heating.",
        "ach_multiplier": 0.9,
        "thickness_add_m": 0.0,
        "k_eff": None,
        "solar_boost": 1.65, # Substantial solar absorption boost
        "cost_inr_flat": 35000.0,
        "cost_inr_per_m2": 0.0,
        "weight_add_kg": 65.0,
        "implementation_days": 5,
    },
    {
        "id": "deep_thermal_retrofit",
        "name": "Deep Thermal Overhaul (Rockwool + Storm Glaze + Sealing)",
        "category": "Complete System Package",
        "description": "Comprehensive military post weatherization package combining 100mm rockwool, storm glazing, and precision air-sealing.",
        "ach_multiplier": 0.25,
        "thickness_add_m": 0.10,
        "k_eff": 0.032,
        "solar_boost": 1.15,
        "cost_inr_flat": 28000.0,
        "cost_inr_per_m2": 850.0,
        "weight_add_kg_per_m2": 11.0,
        "implementation_days": 7,
    },
]


def evaluate_retrofit_options(
    geometry_params: Dict[str, Any],
    location: Dict[str, Any],
    climate: Dict[str, Any],
    operating_conditions: Dict[str, Any],
    simulation_params: Dict[str, Any],
    comfort_config: Dict[str, Any],
    baseline_material_id: int = 6, # Concrete / Stone default
) -> Dict[str, Any]:
    """
    Evaluates baseline existing shelter and tests all discrete upgrade interventions.
    Returns ranked comparison with capital cost, comfort improvement, fuel saved, and payback.
    """
    # 1. Calculate Geometry
    geo = calculate_geometry(
        length=geometry_params["length"],
        width=geometry_params["width"],
        height=geometry_params["height"],
        roof_pitch=geometry_params.get("roof_pitch", 15.0),
    )
    envelope_area = geo["envelope_area"]

    # 2. Baseline Material
    base_mat = get_material_by_id(baseline_material_id) or get_material_by_id(6)
    base_mat_dict = dict(base_mat)

    # 3. Baseline Simulation
    baseline_ts = run_thermal_simulation(
        geometry=geo,
        material=base_mat_dict,
        climate=climate,
        operating_conditions=operating_conditions,
        simulation_params=simulation_params,
    )
    base_summary = summarize_simulation_results(baseline_ts)
    base_comfort = calculate_comfort_score(
        time_series=baseline_ts,
        target_temperature=comfort_config["target_temperature"],
        comfort_band=comfort_config["comfort_band"],
    )
    base_heating_kwh = (base_summary.get("total_heating_load", 0.0) or 0.0) / 1000.0
    base_fuel = calculate_bukhari_fuel(
        base_heating_kwh,
        burn_hours=float(simulation_params.get("duration_hours", 72)),
        ach=float(operating_conditions.get("air_changes_per_hour", 0.5)),
    )

    baseline_data = {
        "name": f"Current Baseline ({base_mat_dict['name']})",
        "comfort_percentage": round(base_comfort["percentage_time_in_comfort_range"], 1),
        "average_indoor_temp": round(base_summary.get("average_indoor_temperature", 0.0), 1),
        "heating_kwh": round(base_heating_kwh, 1),
        "fuel_liters": base_fuel["kerosene_liters"],
        "co_risk_score": base_fuel["co_risk_score"],
        "co_risk_level": base_fuel["co_risk_level"],
        "condensation_risk": base_summary.get("condensation_risk", False),
    }

    # 4. Evaluate each intervention
    evaluated_interventions = []

    for item in INTERVENTIONS:
        # Clone material and modify for intervention
        upgraded_mat = dict(base_mat_dict)
        upgraded_ops = dict(operating_conditions)
        upgraded_climate = dict(climate)

        # Apply ACH reduction
        if item["ach_multiplier"]:
            upgraded_ops["air_changes_per_hour"] = round(
                operating_conditions["air_changes_per_hour"] * item["ach_multiplier"], 2
            )

        # Apply insulation addition (combine U-values)
        if item["k_eff"] and item["thickness_add_m"] > 0:
            # R_base = d_base / k_base, R_add = d_add / k_add
            r_base = base_mat_dict["thickness"] / max(0.001, base_mat_dict["thermal_conductivity"])
            r_add = item["thickness_add_m"] / item["k_eff"]
            r_total = r_base + r_add
            # Effective k for base thickness
            upgraded_mat["thermal_conductivity"] = (base_mat_dict["thickness"] + item["thickness_add_m"]) / r_total
            upgraded_mat["thickness"] = base_mat_dict["thickness"] + item["thickness_add_m"]

        # Apply solar boost for Trombe/glazing
        if item["solar_boost"] != 1.0:
            upgraded_climate["solar_radiation"] = climate["solar_radiation"] * item["solar_boost"]
            upgraded_mat["solar_absorptivity"] = min(0.95, base_mat_dict["solar_absorptivity"] * item["solar_boost"])

        # Run simulation for intervention
        ts = run_thermal_simulation(
            geometry=geo,
            material=upgraded_mat,
            climate=upgraded_climate,
            operating_conditions=upgraded_ops,
            simulation_params=simulation_params,
        )
        summary = summarize_simulation_results(ts)
        comfort = calculate_comfort_score(
            time_series=ts,
            target_temperature=comfort_config["target_temperature"],
            comfort_band=comfort_config["comfort_band"],
        )

        heating_kwh = (summary.get("total_heating_load", 0.0) or 0.0) / 1000.0
        fuel = calculate_bukhari_fuel(
            heating_kwh,
            baseline_heating_kwh=base_heating_kwh,
            burn_hours=float(simulation_params.get("duration_hours", 72)),
            ach=float(upgraded_ops["air_changes_per_hour"]),
        )

        comfort_pct = comfort["percentage_time_in_comfort_range"]
        comfort_gain = round(comfort_pct - baseline_data["comfort_percentage"], 1)
        fuel_saved = round(max(0.0, baseline_data["fuel_liters"] - fuel["kerosene_liters"]), 2)
        energy_saved = round(max(0.0, baseline_data["heating_kwh"] - heating_kwh), 1)

        # Capital cost calculation
        cost_inr = item["cost_inr_flat"] + (envelope_area * item["cost_inr_per_m2"])
        weight_add = item.get("weight_add_kg", 0.0) + (envelope_area * item.get("weight_add_kg_per_m2", 0.0))

        # Payback in high-altitude winter operational seasons (assuming 180 cold days / year)
        # Seasonal fuel savings = (fuel_saved_per_run / duration_days) * 180 days * ₹85/L
        sim_days = max(1.0, simulation_params.get("duration_hours", 72) / 24.0)
        daily_fuel_saved = fuel_saved / sim_days
        seasonal_inr_saved = daily_fuel_saved * 180.0 * 85.0
        payback_years = round(cost_inr / max(100.0, seasonal_inr_saved), 1)

        # Cost-effectiveness score (higher is better)
        # Thermal comfort points + fuel savings per thousand rupees invested
        cost_eff_score = round(
            ((max(0.0, comfort_gain) * 12.0) + (fuel_saved * 15.0)) / max(1.0, cost_inr / 1000.0), 2
        )

        evaluated_interventions.append({
            "id": item["id"],
            "name": item["name"],
            "category": item["category"],
            "description": item["description"],
            "comfort_percentage": round(comfort_pct, 1),
            "comfort_gain_pct": comfort_gain,
            "heating_kwh": round(heating_kwh, 1),
            "energy_saved_kwh": energy_saved,
            "fuel_liters": fuel["kerosene_liters"],
            "fuel_saved_liters": fuel_saved,
            "convoy_drums_saved": fuel.get("convoy_drums_saved", 0.0),
            "capital_cost_inr": round(cost_inr),
            "seasonal_fuel_saved_inr": round(seasonal_inr_saved),
            "payback_years": payback_years,
            "weight_added_kg": round(weight_add, 1),
            "implementation_days": item["implementation_days"],
            "co_risk_score": fuel["co_risk_score"],
            "co_risk_level": fuel["co_risk_level"],
            "condensation_risk": summary.get("condensation_risk", False),
            "cost_effectiveness_score": cost_eff_score,
        })

    # Rank by cost-effectiveness score descending
    evaluated_interventions.sort(key=lambda x: x["cost_effectiveness_score"], reverse=True)
    for rank, item in enumerate(evaluated_interventions, start=1):
        item["rank"] = rank

    top_rec = evaluated_interventions[0] if evaluated_interventions else None

    return {
        "baseline": baseline_data,
        "interventions": evaluated_interventions,
        "top_recommendation": top_rec,
        "meta": {
            "shelter_envelope_m2": round(envelope_area, 1),
            "sim_hours": simulation_params.get("duration_hours", 72),
            "fuel_price_inr_per_l": 85.0,
            "methodology": "Dynamic transient thermal simulation delta against baseline existing structure.",
        }
    }
