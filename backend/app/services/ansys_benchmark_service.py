"""
ANSYS Benchmark Repository — loads, validates, and serves reference datasets.

Responsible for:
  - Discovering available benchmark datasets from manifest.json
  - Validating CSV/metadata structure and data integrity
  - Loading temperature time-series deterministically
  - Exposing dataset provenance and status
  - Never fabricating or mislabeling data sources

All benchmark files are loaded relative to:
  backend/app/data/ansys_benchmarks/
"""

from __future__ import annotations

import csv
import json
import math
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

_BENCHMARK_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "ansys_benchmarks")


class DatasetStatus(str, Enum):
    """Status of a benchmark dataset."""
    NOT_AVAILABLE = "not_available"
    PENDING = "pending"
    FIXTURE_ONLY = "fixture_only"
    AVAILABLE = "available"
    VERIFIED = "verified"
    FAILED = "failed"


class DatasetSource(str, Enum):
    """Provenance source of benchmark data."""
    ANSYS_FLUENT = "ANSYS_FLUENT"
    ANSYS_MECHANICAL = "ANSYS_MECHANICAL_TRANSIENT_THERMAL"
    TEST_FIXTURE = "TEST_FIXTURE"
    ANALYTICAL_REFERENCE = "ANALYTICAL_REFERENCE"


@dataclass
class BenchmarkPoint:
    time_s: float
    indoor_temperature_c: float


@dataclass
class BenchmarkMetadata:
    case_id: str
    display_name: str
    source: str
    source_type: str
    software: str
    software_version: str
    geometry: dict
    material: dict
    boundary_conditions: dict
    ventilation: dict
    initial_conditions: dict
    simulation: dict
    derived_rc_params: dict
    temperature_unit: str
    provenance: dict


@dataclass
class BenchmarkDataset:
    """A complete benchmark dataset with metadata and time-series."""
    metadata: BenchmarkMetadata
    points: list[BenchmarkPoint] = field(default_factory=list)
    status: DatasetStatus = DatasetStatus.NOT_AVAILABLE
    source: DatasetSource = DatasetSource.TEST_FIXTURE
    error: Optional[str] = None

    @property
    def timestamps_s(self) -> list[float]:
        return [p.time_s for p in self.points]

    @property
    def temperatures_c(self) -> list[float]:
        return [p.indoor_temperature_c for p in self.points]

    @property
    def duration_s(self) -> float:
        if not self.points:
            return 0.0
        return self.points[-1].time_s - self.points[0].time_s

    @property
    def n_points(self) -> int:
        return len(self.points)


class BenchmarkLoadError(Exception):
    """Raised when a benchmark dataset fails validation."""
    pass


def _validate_csv_data(points: list[BenchmarkPoint], case_id: str) -> None:
    """Validate loaded CSV data for integrity."""
    if len(points) < 2:
        raise BenchmarkLoadError(f"{case_id}: Insufficient data points ({len(points)})")

    for i, p in enumerate(points):
        if math.isnan(p.time_s) or math.isinf(p.time_s):
            raise BenchmarkLoadError(f"{case_id}: Non-finite timestamp at row {i}")
        if math.isnan(p.indoor_temperature_c) or math.isinf(p.indoor_temperature_c):
            raise BenchmarkLoadError(f"{case_id}: Non-finite temperature at row {i}")

    # Check monotonicity
    for i in range(1, len(points)):
        if points[i].time_s <= points[i - 1].time_s:
            raise BenchmarkLoadError(
                f"{case_id}: Non-monotonic timestamps at rows {i-1}-{i}: "
                f"{points[i-1].time_s} >= {points[i].time_s}"
            )

    # Check for duplicates
    times = [p.time_s for p in points]
    if len(set(times)) != len(times):
        raise BenchmarkLoadError(f"{case_id}: Duplicate timestamps detected")


def _load_single_benchmark(case_dir: str, case_id: str) -> BenchmarkDataset:
    """Load a single benchmark from its directory."""
    meta_path = os.path.join(case_dir, "metadata.json")
    csv_path = os.path.join(case_dir, "temperature.csv")

    if not os.path.isfile(meta_path):
        raise BenchmarkLoadError(f"{case_id}: metadata.json not found at {meta_path}")
    if not os.path.isfile(csv_path):
        raise BenchmarkLoadError(f"{case_id}: temperature.csv not found at {csv_path}")

    # Load metadata
    with open(meta_path, "r") as f:
        raw_meta = json.load(f)

    metadata = BenchmarkMetadata(
        case_id=raw_meta.get("case_id", case_id),
        display_name=raw_meta.get("display_name", case_id),
        source=raw_meta.get("source", "UNKNOWN"),
        source_type=raw_meta.get("source_type", "unknown"),
        software=raw_meta.get("software", "unknown"),
        software_version=raw_meta.get("software_version", "unknown"),
        geometry=raw_meta.get("geometry", {}),
        material=raw_meta.get("material", {}),
        boundary_conditions=raw_meta.get("boundary_conditions", {}),
        ventilation=raw_meta.get("ventilation", {}),
        initial_conditions=raw_meta.get("initial_conditions", {}),
        simulation=raw_meta.get("simulation", {}),
        derived_rc_params=raw_meta.get("derived_rc_params", {}),
        temperature_unit=raw_meta.get("temperature_unit", "degC"),
        provenance=raw_meta.get("provenance", {}),
    )

    # Determine source and status
    source_str = metadata.source.upper()
    if "ANSYS" in source_str:
        if "FLUENT" in source_str:
            source = DatasetSource.ANSYS_FLUENT
        else:
            source = DatasetSource.ANSYS_MECHANICAL
        status = DatasetStatus.AVAILABLE
    elif source_str == "TEST_FIXTURE":
        source = DatasetSource.TEST_FIXTURE
        status = DatasetStatus.FIXTURE_ONLY
    else:
        source = DatasetSource.ANALYTICAL_REFERENCE
        status = DatasetStatus.FIXTURE_ONLY

    # Load CSV
    points: list[BenchmarkPoint] = []
    with open(csv_path, "r", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                t = float(row["time_s"])
                T = float(row["indoor_temperature_c"])
                points.append(BenchmarkPoint(time_s=t, indoor_temperature_c=T))
            except (KeyError, ValueError) as e:
                raise BenchmarkLoadError(f"{case_id}: Malformed CSV row: {e}")

    # Validate
    _validate_csv_data(points, case_id)

    return BenchmarkDataset(
        metadata=metadata,
        points=points,
        status=status,
        source=source,
    )


class ANSYSBenchmarkRepository:
    """
    Central repository for ANSYS benchmark datasets.

    Loads from manifest.json on initialization, caches parsed data.
    Thread-safe for read access (immutable after __init__).
    """

    def __init__(self, benchmark_dir: Optional[str] = None):
        self._dir = benchmark_dir or _BENCHMARK_DIR
        self._datasets: dict[str, BenchmarkDataset] = {}
        self._manifest: dict = {}
        self._load_manifest()

    def _load_manifest(self) -> None:
        """Load manifest and all referenced datasets."""
        manifest_path = os.path.join(self._dir, "manifest.json")
        if not os.path.isfile(manifest_path):
            return

        with open(manifest_path, "r") as f:
            self._manifest = json.load(f)

        for entry in self._manifest.get("benchmarks", []):
            case_id = entry["case_id"]
            case_dir_name = entry.get("directory", case_id)
            case_dir = os.path.join(self._dir, case_dir_name)

            try:
                dataset = _load_single_benchmark(case_dir, case_id)
                self._datasets[case_id] = dataset
            except BenchmarkLoadError as e:
                # Store error but don't crash — other datasets may be fine
                self._datasets[case_id] = BenchmarkDataset(
                    metadata=BenchmarkMetadata(
                        case_id=case_id,
                        display_name=entry.get("display_name", case_id),
                        source=entry.get("source", "UNKNOWN"),
                        source_type="error",
                        software="",
                        software_version="",
                        geometry={}, material={}, boundary_conditions={},
                        ventilation={}, initial_conditions={}, simulation={},
                        derived_rc_params={}, temperature_unit="degC",
                        provenance={},
                    ),
                    status=DatasetStatus.NOT_AVAILABLE,
                    error=str(e),
                )

    def list_benchmarks(self) -> list[dict]:
        """Return summary of all benchmarks."""
        results = []
        for case_id, ds in self._datasets.items():
            results.append({
                "case_id": case_id,
                "display_name": ds.metadata.display_name,
                "source": ds.source.value,
                "status": ds.status.value,
                "n_points": ds.n_points,
                "duration_s": ds.duration_s,
                "error": ds.error,
            })
        return results

    def get_benchmark(self, case_id: str) -> Optional[BenchmarkDataset]:
        """Return a specific benchmark dataset, or None."""
        return self._datasets.get(case_id)

    def get_available_case_ids(self) -> list[str]:
        return list(self._datasets.keys())

    @property
    def has_real_ansys_data(self) -> bool:
        """True if at least one dataset comes from genuine ANSYS."""
        return any(
            ds.source in (DatasetSource.ANSYS_FLUENT, DatasetSource.ANSYS_MECHANICAL)
            for ds in self._datasets.values()
        )


# Module-level singleton for reuse
_repo: Optional[ANSYSBenchmarkRepository] = None


def get_benchmark_repository() -> ANSYSBenchmarkRepository:
    """Get or create the module-level benchmark repository singleton."""
    global _repo
    if _repo is None:
        _repo = ANSYSBenchmarkRepository()
    return _repo
