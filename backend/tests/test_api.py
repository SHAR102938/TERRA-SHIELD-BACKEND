"""
Comprehensive API integration tests for FastAPI backend using TestClient.
Tests:
- Health check
- Climate endpoint with fallback / cache
- Materials catalog and assembly evaluation
- Simulation execution
- Preset projects
- Parametric optimization sweep
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
    assert "THERMASHELL" in data["app"]


def test_climate_power_fallback(client):
    resp = client.get("/api/v1/climate/power?lat=34.15&lon=77.58&start=20240115&end=20240117")
    assert resp.status_code == 200
    data = resp.json()
    assert "parameters" in data
    assert "T2M" in data["parameters"]


def test_materials_catalog(client):
    resp = client.get("/api/v1/materials")
    assert resp.status_code == 200
    materials = resp.json()
    assert len(materials) >= 10
    names = [m["name"] for m in materials]
    assert any("Stone" in n for n in names)
    assert any("Insulation" in n or "EPS" in n for n in names)


def test_materials_evaluate(client):
    payload = {
        "surface_type": "wall",
        "layers": [
            {"name": "Plaster", "thickness_mm": 15, "conductivity": 0.72},
            {"name": "Brick", "thickness_mm": 230, "conductivity": 0.84},
            {"name": "EPS", "thickness_mm": 100, "conductivity": 0.035},
            {"name": "Plaster", "thickness_mm": 15, "conductivity": 0.72}
        ]
    }
    resp = client.post("/api/v1/materials/evaluate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["r_value"] > 2.5
    assert data["u_value"] < 0.45


def test_simulation_run(client):
    payload = {
        "length_m": 6.0,
        "width_m": 4.0,
        "height_m": 3.0,
        "wall_layers": [
            {"name": "Plaster", "thickness_mm": 15, "conductivity": 0.72},
            {"name": "Stone", "thickness_mm": 300, "conductivity": 1.5},
            {"name": "EPS", "thickness_mm": 100, "conductivity": 0.035}
        ],
        "roof_layers": [
            {"name": "Metal Sheet", "thickness_mm": 2, "conductivity": 50.0},
            {"name": "XPS", "thickness_mm": 100, "conductivity": 0.034}
        ],
        "duration_hours": 24,
        "base_outdoor_temp_c": -10.0,
        "hvac_mode": "heated",
        "target_temp_c": 18.0
    }
    resp = client.post("/api/v1/simulations/run", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["timestamps"]) == 24
    assert len(data["indoor_temp_c"]) == 24
    assert "heat_balance" in data
    assert "comfort" in data


def test_projects(client):
    resp = client.get("/api/v1/projects")
    assert resp.status_code == 200
    projects = resp.json()
    assert len(projects) >= 2
    leh = [p for p in projects if p["id"] == "leh-winter-demo"][0]
    assert "Leh" in leh["name"]


def test_optimization_sweep(client):
    payload = {
        "base_scenario": {
            "length_m": 6.0,
            "width_m": 4.0,
            "height_m": 3.0,
            "wall_layers": [
                {"name": "Stone", "thickness_mm": 300, "conductivity": 1.5},
                {"name": "EPS", "thickness_mm": 80, "conductivity": 0.035}
            ],
            "roof_layers": [
                {"name": "Metal Sheet", "thickness_mm": 2, "conductivity": 50.0},
                {"name": "XPS", "thickness_mm": 100, "conductivity": 0.034}
            ],
            "duration_hours": 24
        },
        "insulation_thicknesses_m": [0.05, 0.10],
        "window_u_values": [5.7, 2.8],
        "ach_values": [0.3],
        "max_candidates": 4
    }
    resp = client.post("/api/v1/optimization/sweep", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "candidates" in data
    assert len(data["candidates"]) > 0
    assert "pareto_optimal" in data
