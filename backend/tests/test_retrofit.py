"""
Unit tests for Retrofit Advisory Engine (Feature B).
"""

import pytest
from app.services.retrofit_engine import evaluate_retrofit_options


def test_evaluate_retrofit():
    geo_params = {"length": 6.0, "width": 4.0, "height": 3.0, "roof_pitch": 15.0}
    loc = {"latitude": 34.15, "longitude": 77.58}
    clim = {
        "temperature": -10.0,
        "temperature_amplitude": 5.0,
        "solar_radiation": 400.0,
        "relative_humidity": 30.0,
        "wind_speed": 4.0,
    }
    ops = {
        "target_temperature": 18.0,
        "initial_indoor_temperature": 18.0,
        "occupants": 4,
        "heat_per_person": 50.0,
        "air_changes_per_hour": 1.2,
    }
    sim_params = {"duration_hours": 24, "timestep_hours": 1.0}
    comfort_cfg = {"target_temperature": 18.0, "comfort_band": 2.0}

    results = evaluate_retrofit_options(
        geometry_params=geo_params,
        location=loc,
        climate=clim,
        operating_conditions=ops,
        simulation_params=sim_params,
        comfort_config=comfort_cfg,
        baseline_material_id=6,
    )

    assert "baseline" in results
    assert "interventions" in results
    assert len(results["interventions"]) >= 5

    # Check top recommendation has rank 1
    assert results["top_recommendation"] is not None
    assert results["top_recommendation"]["rank"] == 1

    # Check cost effectiveness and payback are positive numbers
    for item in results["interventions"]:
        assert item["capital_cost_inr"] > 0
        assert item["payback_years"] >= 0
        assert "comfort_percentage" in item
        assert "fuel_saved_liters" in item
