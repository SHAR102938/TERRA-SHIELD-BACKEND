"""
Unit tests for Bukhari Fuel, Convoy Logistics, and CO Risk Models (Feature A).
"""

import pytest
from app.services.fuel_model import calculate_bukhari_fuel


def test_zero_heating_load():
    res = calculate_bukhari_fuel(0.0)
    assert res["kerosene_liters"] == 0.0
    assert res["kerosene_kg"] == 0.0
    assert res["co_risk_score"] == 0.0
    assert res["co_risk_level"] == "NEGLIGIBLE"


def test_positive_fuel_calculation():
    # 60 kWh heating load -> with 6.0 kWh/L effective heat = 10.0 Liters
    res = calculate_bukhari_fuel(60.0, burn_hours=24.0, ach=0.5)
    assert res["kerosene_liters"] == 10.0
    assert res["kerosene_kg"] == round(10.0 * 0.81, 2)
    assert res["fuel_cost_inr"] == 850.0  # 10L * ₹85


def test_baseline_fuel_savings_and_convoy():
    # 60 kWh actual vs 180 kWh baseline
    res = calculate_bukhari_fuel(60.0, baseline_heating_kwh=180.0, burn_hours=72.0, ach=0.5)
    assert res["kerosene_liters"] == 10.0
    # Baseline liters = 180 / 6 = 30L
    assert res["liters_saved_vs_baseline"] == 20.0
    assert res["percentage_fuel_reduction"] == round((20.0 / 30.0) * 100, 1)
    # Convoy drums (200L each)
    assert res["convoy_drums_saved"] == 0.10


def test_co_risk_levels():
    # Low burn in well ventilated room
    low = calculate_bukhari_fuel(12.0, burn_hours=24.0, ach=1.5)
    assert low["co_risk_score"] < 30.0
    assert low["co_risk_level"] == "LOW"

    # Extreme burn in unventilated room
    crit = calculate_bukhari_fuel(600.0, burn_hours=24.0, ach=0.2)
    assert crit["co_risk_score"] >= 80.0
    assert crit["co_risk_level"] == "CRITICAL"
