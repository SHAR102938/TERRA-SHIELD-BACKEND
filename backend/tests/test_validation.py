"""
Unit and integration tests for ANSYS Validation Engine and Benchmark Repository.
Tests verify:
- Benchmark discovery and integrity from manifest.json
- Time-alignment interpolation and boundary handling
- Statistical validation metrics (MAE, RMSE, Pearson r, R^2, NRMSE)
- Honest status classification (never claims VERIFIED for test fixtures)
- Validation API endpoints (/benchmarks, /ansys-status, POST /validation)
"""

import math
import pytest
from starlette.testclient import TestClient

from backend.main import app
from app.services.ansys_benchmark_service import (
    ANSYSBenchmarkRepository,
    get_benchmark_repository,
    DatasetStatus,
    DatasetSource,
)
from app.services.ansys_validation_engine import (
    align_time_series,
    calculate_validation_metrics,
    classify_validation_status,
    run_benchmark_validation,
    ValidationStatus,
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_benchmark_repository_discovery():
    repo = get_benchmark_repository()
    benchmarks = repo.list_benchmarks()
    assert len(benchmarks) >= 3

    case_ids = [b["case_id"] for b in benchmarks]
    assert "ansys_case_a" in case_ids
    assert "ansys_case_b" in case_ids
    assert "ansys_case_c" in case_ids

    # Verify honest reporting of test fixtures vs real ANSYS data
    assert repo.has_real_ansys_data is False
    for b in benchmarks:
        assert b["source"] == "TEST_FIXTURE"
        assert b["status"] == "fixture_only"


def test_benchmark_dataset_integrity():
    repo = get_benchmark_repository()
    ds = repo.get_benchmark("ansys_case_a")
    assert ds is not None
    assert ds.error is None
    assert ds.n_points == 49
    assert ds.duration_s == 172800.0  # 48 hours
    assert ds.points[0].indoor_temperature_c == 30.0
    # Room cools towards outdoor equilibrium (10 °C)
    assert ds.points[-1].indoor_temperature_c < 15.0


def test_time_alignment():
    # Test aligning 1-hour grid with 30-min grid
    ts_a = [0.0, 3600.0, 7200.0]
    vals_a = [10.0, 20.0, 30.0]

    ts_b = [0.0, 1800.0, 3600.0, 5400.0, 7200.0]
    vals_b = [10.0, 15.0, 20.0, 25.0, 30.0]

    common_t, aligned_a, aligned_b, info = align_time_series(ts_a, vals_a, ts_b, vals_b)
    assert len(common_t) == 5
    assert aligned_a == [10.0, 15.0, 20.0, 25.0, 30.0]
    assert aligned_b == [10.0, 15.0, 20.0, 25.0, 30.0]
    assert info.sample_count == 5


def test_validation_metrics_perfect_match():
    times = [0.0, 3600.0, 7200.0]
    curve = [20.0, 22.0, 25.0]
    m = calculate_validation_metrics(curve, curve, times)

    assert m.mae_c == 0.0
    assert m.rmse_c == 0.0
    assert m.pearson_r == 1.0
    assert m.r_squared == 1.0
    assert m.peak_temperature_error_c == 0.0
    assert m.max_absolute_error_c == 0.0
    assert m.mean_bias_error_c == 0.0


def test_honest_status_classification():
    times = [0.0, 3600.0, 7200.0]
    curve_a = [20.0, 22.0, 24.0]
    curve_b = [20.0, 22.05, 24.0]  # Very small error
    metrics = calculate_validation_metrics(curve_a, curve_b, times)

    # If source is TEST_FIXTURE, must NEVER be VERIFIED
    status_fixture = classify_validation_status(metrics, "TEST_FIXTURE")
    assert status_fixture == ValidationStatus.FIXTURE_ONLY

    # If source is genuine ANSYS, small error qualifies for VERIFIED
    status_ansys = classify_validation_status(metrics, "ANSYS_FLUENT")
    assert status_ansys == ValidationStatus.VERIFIED


def test_api_list_benchmarks(client):
    resp = client.get("/api/v1/validation/benchmarks")
    assert resp.status_code == 200
    data = resp.json()
    assert "analytical" in data
    assert "ansys" in data
    assert len(data["analytical"]) >= 4
    assert len(data["ansys"]) >= 3
    assert data["has_real_ansys_data"] is False


def test_api_ansys_status(client):
    resp = client.get("/api/v1/validation/ansys-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ansys_integrated"] is True
    assert data["has_real_ansys_data"] is False
    assert "status_notice" in data


def test_api_run_validation_ansys_case(client):
    resp = client.post("/api/v1/validation", json={"case_id": "ansys_case_a"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["case_id"] == "ansys_case_a"
    assert data["status"] == "FIXTURE_ONLY"
    assert data["is_real_ansys"] is False
    assert "comparison" in data
    assert "advanced_metrics" in data
    assert data["comparison"]["mae"] < 0.1
    assert data["advanced_metrics"]["r_squared"] > 0.95
