"""
Unit tests for Core Physics Corrections (Bugs 1, 2, 4, 5, and Dew-Point Condensation Risk).
"""

import math
import pytest
from app.services.geometry_engine import calculate_geometry
from app.services.comfort_engine import summarize_simulation_results


def test_gable_wall_geometry():
    # 6m length, 4m width, 3m height, 15° pitch
    length, width, height, pitch = 6.0, 4.0, 3.0, 15.0
    half_w = width / 2.0
    rise = half_w * math.tan(math.radians(pitch))
    
    expected_rectangular = 2 * (length * height) + 2 * (width * height)
    expected_gable_triangles = width * rise
    expected_total_wall = expected_rectangular + expected_gable_triangles

    geo = calculate_geometry(length, width, height, pitch)
    assert math.isclose(geo["wall_area"], expected_total_wall, rel_tol=1e-3)
    assert geo["volume"] > (length * width * height)  # Includes triangular roof attic volume


def test_dew_point_and_condensation_flag():
    # Scenario: Cold wall (2°C) in humid room (indoor temp 18°C, RH 75%)
    mock_ts = [
        {
            "hour": 1,
            "indoor_temperature": 18.0,
            "wall_temperature": 2.0,
            "roof_temperature": 5.0,
            "conduction_loss": 500.0,
            "relative_humidity": 75.0,
        },
        {
            "hour": 2,
            "indoor_temperature": 18.0,
            "wall_temperature": 2.0,
            "roof_temperature": 5.0,
            "conduction_loss": 500.0,
            "relative_humidity": 75.0,
        }
    ]
    summary = summarize_simulation_results(mock_ts)
    assert "dew_point_c" in summary
    assert "condensation_risk" in summary
    # At 18°C and 75% RH, dew point is ~13.4°C.
    # Since wall temp is 2.0°C <= 13.4°C, condensation risk MUST be True!
    assert summary["dew_point_c"] > 10.0
    assert summary["condensation_risk"] is True
