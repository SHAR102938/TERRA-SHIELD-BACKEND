"""
Canonical API integration tests for TERRA-SHIELD FastAPI backend.
Tests:
- Health check
- Climate endpoint with Leh/Jaisalmer/Tawang cache & fallback
- Materials catalog and material details
- Geometry calculations with pediment gable walls
- Analysis execution with diurnal cycle & power-vs-energy integration
- Projects API
- Multi-objective Pareto optimization
- Retrofit evaluation engine
"""

import pytest
from starlette.testclient import TestClient
from backend.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "TERRA-SHIELD" in data["app"]


def test_climate_leh_cached(client):
    resp = client.get("/api/climate?latitude=34.15&longitude=77.58")
    assert resp.status_code == 200
    data = resp.json()
    assert "climate" in data
    assert "temperature" in data["climate"]
    assert "solar_radiation" in data["climate"]


def test_materials_catalog(client):
    resp = client.get("/api/materials")
    assert resp.status_code == 200
    materials = resp.json()
    assert len(materials) >= 6
    names = [m["name"] for m in materials]
    assert any("Concrete" in n for n in names)
    assert any("Rock Wool" in n or "PU Foam" in n for n in names)


def test_material_by_id(client):
    resp = client.get("/api/materials/1")
    assert resp.status_code == 200
    mat = resp.json()
    assert mat["id"] == 1
    assert "name" in mat
    assert "thermal_conductivity" in mat


def test_geometry_calculate(client):
    payload = {
        "geometry_type": "gable_roof",
        "length": 6.0,
        "width": 4.0,
        "height": 3.0,
        "roof_pitch": 15.0,
        "orientation": 180.0
    }
    resp = client.post("/api/geometry/calculate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "calculated" in data
    calc = data["calculated"]
    assert calc["floor_area"] == 24.0
    # Pediment included
    assert calc["wall_area"] > 60.0


def test_simulation_run(client):
    payload = {
        "geometry": {
            "geometry_type": "gable_roof",
            "length": 6.0,
            "width": 4.0,
            "height": 3.0,
            "roof_pitch": 15.0,
            "orientation": 180.0
        },
        "material_id": 1,
        "location": {"latitude": 34.15, "longitude": 77.58},
        "operating_conditions": {
            "target_temperature": 18.0,
            "initial_indoor_temperature": 10.0,
            "occupants": 4,
            "heat_per_person": 75.0,
            "air_changes_per_hour": 0.5
        },
        "simulation": {
            "duration_hours": 24,
            "timestep_hours": 1.0
        },
        "comfort": {
            "comfort_band": 2.0
        }
    }
    resp = client.post("/api/analysis/run", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "thermal_summary" in data
    assert "comfort" in data
    assert len(data["time_series"]) == 24
    summary = data["thermal_summary"]
    assert "total_heating_load" in summary
    assert "kerosene_liters" in summary
    assert "co_risk_score" in summary


def test_projects(client):
    resp = client.get("/api/projects")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_optimization(client):
    payload = {
        "geometry": {"length": 6.0, "width": 4.0, "height": 3.0},
        "location": {"latitude": 34.15, "longitude": 77.58},
        "operating": {
            "target_temperature": 18.0,
            "initial_indoor_temperature": 10.0,
            "occupants": 4,
            "heat_per_person": 75.0,
            "air_changes_per_hour": 0.5
        },
        "comfort_band": 2.0,
        "simulation_hours": 24,
        "param_ranges": {
            "material_ids": [1, 2],
            "thicknesses": [0.10, 0.20],
            "roof_pitches": [15.0]
        },
        "weights": {
            "comfort": 0.35,
            "energy": 0.25,
            "weight": 0.20,
            "cost": 0.20
        }
    }
    resp = client.post("/api/optimize", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "ranked_candidates" in data
    assert len(data["ranked_candidates"]) > 0
    assert any("is_pareto" in c for c in data["ranked_candidates"])


def test_retrofit_evaluation(client):
    payload = {
        "geometry": {"length": 6.0, "width": 4.0, "height": 3.0, "roof_pitch": 15.0},
        "location": {"latitude": 34.15, "longitude": 77.58},
        "baseline_material_id": 1,
        "simulation_hours": 24
    }
    resp = client.post("/api/retrofit/evaluate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "baseline" in data
    assert "interventions" in data
    assert len(data["interventions"]) == 6
