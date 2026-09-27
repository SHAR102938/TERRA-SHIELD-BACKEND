"""
ANSYS Validation Engine — time-aligned comparison of THERMASHELL vs reference curves.

Pure computation module with no web, database, or filesystem dependencies.
All functions are independently unit-testable.

Metrics:
  - MAE (Mean Absolute Error)
  - RMSE (Root Mean Square Error)
  - Pearson correlation coefficient
  - R-squared (coefficient of determination)
  - Peak temperature error (signed + absolute)
  - Maximum absolute error
  - Mean bias error
  - Normalized RMSE (percentage of temperature range)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class ValidationStatus(str, Enum):
    NOT_AVAILABLE = "not_available"
    PENDING = "pending"
    FIXTURE_ONLY = "fixture_only"
    VERIFIED = "verified"
    FAILED = "failed"


@dataclass
class AlignmentInfo:
    """Describes how two time-series were aligned for comparison."""
    sample_count: int
    overlap_start_s: float
    overlap_end_s: float
    overlap_duration_s: float
    interpolation_method: str
    thermashell_original_count: int
    reference_original_count: int


@dataclass
class ValidationMetrics:
    """Full set of validation metrics comparing two temperature curves."""
    mae_c: float
    rmse_c: float
    pearson_r: Optional[float]
    r_squared: Optional[float]
    peak_temperature_thermashell_c: float
    peak_temperature_reference_c: float
    peak_temperature_error_c: float
    peak_temperature_abs_error_c: float
    peak_time_thermashell_s: float
    peak_time_reference_s: float
    max_absolute_error_c: float
    mean_bias_error_c: float
    normalized_rmse_percent: Optional[float]


@dataclass
class ValidationResult:
    """Complete result of a benchmark validation."""
    case_id: str
    source: str
    status: ValidationStatus
    metrics: Optional[ValidationMetrics]
    alignment: Optional[AlignmentInfo]
    thermashell_timestamps_s: list[float]
    thermashell_temperatures_c: list[float]
    reference_timestamps_s: list[float]
    reference_temperatures_c: list[float]
    error: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to JSON-serializable dict."""
        d = {
            "benchmark": {
                "case_id": self.case_id,
                "source": self.source,
                "status": self.status.value,
            },
            "error": self.error,
        }
        if self.metrics:
            d["metrics"] = {
                "mae_c": self.metrics.mae_c,
                "rmse_c": self.metrics.rmse_c,
                "pearson_r": self.metrics.pearson_r,
                "r_squared": self.metrics.r_squared,
                "peak_temperature_thermashell_c": self.metrics.peak_temperature_thermashell_c,
                "peak_temperature_reference_c": self.metrics.peak_temperature_reference_c,
                "peak_temperature_error_c": self.metrics.peak_temperature_error_c,
                "peak_temperature_abs_error_c": self.metrics.peak_temperature_abs_error_c,
                "peak_time_thermashell_s": self.metrics.peak_time_thermashell_s,
                "peak_time_reference_s": self.metrics.peak_time_reference_s,
                "max_absolute_error_c": self.metrics.max_absolute_error_c,
                "mean_bias_error_c": self.metrics.mean_bias_error_c,
                "normalized_rmse_percent": self.metrics.normalized_rmse_percent,
            }
        if self.alignment:
            d["alignment"] = {
                "sample_count": self.alignment.sample_count,
                "overlap_start_s": self.alignment.overlap_start_s,
                "overlap_end_s": self.alignment.overlap_end_s,
                "overlap_duration_s": self.alignment.overlap_duration_s,
                "interpolation_method": self.alignment.interpolation_method,
                "thermashell_original_count": self.alignment.thermashell_original_count,
                "reference_original_count": self.alignment.reference_original_count,
            }
        d["curves"] = {
            "thermashell_timestamps_s": self.thermashell_timestamps_s,
            "thermashell_temperatures_c": self.thermashell_temperatures_c,
            "reference_timestamps_s": self.reference_timestamps_s,
            "reference_temperatures_c": self.reference_temperatures_c,
        }
        return d


# ── Time alignment ──────────────────────────────────────────────────────────

def align_time_series(
    ts_a_times: list[float], ts_a_values: list[float],
    ts_b_times: list[float], ts_b_values: list[float],
) -> tuple[list[float], list[float], list[float], AlignmentInfo]:
    """
    Align two time-series onto a common time grid using linear interpolation.

    The common grid uses the timestamps of whichever series has more points
    within the overlapping interval.

    Returns:
        (common_times, aligned_a, aligned_b, alignment_info)
    """
    if not ts_a_times or not ts_b_times:
        raise ValueError("Cannot align empty time-series")

    # Find overlap
    overlap_start = max(ts_a_times[0], ts_b_times[0])
    overlap_end = min(ts_a_times[-1], ts_b_times[-1])

    if overlap_end <= overlap_start:
        raise ValueError(
            f"No time overlap: A=[{ts_a_times[0]}, {ts_a_times[-1]}], "
            f"B=[{ts_b_times[0]}, {ts_b_times[-1]}]"
        )

    # Use the denser grid within the overlap
    a_in_overlap = [t for t in ts_a_times if overlap_start <= t <= overlap_end]
    b_in_overlap = [t for t in ts_b_times if overlap_start <= t <= overlap_end]

    if len(a_in_overlap) >= len(b_in_overlap):
        common_times = a_in_overlap
    else:
        common_times = b_in_overlap

    if len(common_times) < 2:
        raise ValueError("Insufficient overlap for meaningful comparison")

    # Interpolate both onto common grid
    aligned_a = _interpolate(ts_a_times, ts_a_values, common_times)
    aligned_b = _interpolate(ts_b_times, ts_b_values, common_times)

    info = AlignmentInfo(
        sample_count=len(common_times),
        overlap_start_s=overlap_start,
        overlap_end_s=overlap_end,
        overlap_duration_s=overlap_end - overlap_start,
        interpolation_method="linear",
        thermashell_original_count=len(ts_a_times),
        reference_original_count=len(ts_b_times),
    )

    return common_times, aligned_a, aligned_b, info


def _interpolate(x_known: list[float], y_known: list[float], x_query: list[float]) -> list[float]:
    """Linear interpolation of y_known at x_query points."""
    result = []
    j = 0
    n = len(x_known)

    for xq in x_query:
        # Advance j to bracket xq
        while j < n - 2 and x_known[j + 1] < xq:
            j += 1

        if xq <= x_known[0]:
            result.append(y_known[0])
        elif xq >= x_known[-1]:
            result.append(y_known[-1])
        else:
            x0, x1 = x_known[j], x_known[j + 1]
            y0, y1 = y_known[j], y_known[j + 1]
            if x1 == x0:
                result.append(y0)
            else:
                t = (xq - x0) / (x1 - x0)
                result.append(y0 + t * (y1 - y0))

    return result


# ── Metrics computation ─────────────────────────────────────────────────────

def calculate_validation_metrics(
    thermashell_temps: list[float],
    reference_temps: list[float],
    timestamps_s: list[float],
) -> ValidationMetrics:
    """
    Calculate all validation metrics between aligned temperature curves.

    Both inputs must be the same length (already aligned).
    """
    n = len(thermashell_temps)
    if n == 0 or len(reference_temps) != n or len(timestamps_s) != n:
        raise ValueError("Input arrays must be non-empty and equal length")

    # Check for non-finite values
    for i in range(n):
        if not math.isfinite(thermashell_temps[i]) or not math.isfinite(reference_temps[i]):
            raise ValueError(f"Non-finite value at index {i}")

    # ── MAE ──
    abs_errors = [abs(thermashell_temps[i] - reference_temps[i]) for i in range(n)]
    mae = sum(abs_errors) / n

    # ── RMSE ──
    sq_errors = [(thermashell_temps[i] - reference_temps[i]) ** 2 for i in range(n)]
    rmse = math.sqrt(sum(sq_errors) / n)

    # ── Max absolute error ──
    max_abs_err = max(abs_errors)

    # ── Mean bias error ──
    biases = [thermashell_temps[i] - reference_temps[i] for i in range(n)]
    mean_bias = sum(biases) / n

    # ── Pearson correlation ──
    pearson_r = _pearson_correlation(thermashell_temps, reference_temps)

    # ── R-squared ──
    r_squared = _r_squared(thermashell_temps, reference_temps)

    # ── Peak temperatures ──
    peak_idx_ts = max(range(n), key=lambda i: thermashell_temps[i])
    peak_idx_ref = max(range(n), key=lambda i: reference_temps[i])

    peak_temp_ts = thermashell_temps[peak_idx_ts]
    peak_temp_ref = reference_temps[peak_idx_ref]
    peak_time_ts = timestamps_s[peak_idx_ts]
    peak_time_ref = timestamps_s[peak_idx_ref]

    # ── Normalized RMSE ──
    ref_range = max(reference_temps) - min(reference_temps)
    if ref_range > 0.001:
        nrmse = (rmse / ref_range) * 100.0
    else:
        nrmse = None  # Cannot normalize against near-constant reference

    return ValidationMetrics(
        mae_c=round(mae, 6),
        rmse_c=round(rmse, 6),
        pearson_r=round(pearson_r, 6) if pearson_r is not None else None,
        r_squared=round(r_squared, 6) if r_squared is not None else None,
        peak_temperature_thermashell_c=round(peak_temp_ts, 4),
        peak_temperature_reference_c=round(peak_temp_ref, 4),
        peak_temperature_error_c=round(peak_temp_ts - peak_temp_ref, 4),
        peak_temperature_abs_error_c=round(abs(peak_temp_ts - peak_temp_ref), 4),
        peak_time_thermashell_s=peak_time_ts,
        peak_time_reference_s=peak_time_ref,
        max_absolute_error_c=round(max_abs_err, 6),
        mean_bias_error_c=round(mean_bias, 6),
        normalized_rmse_percent=round(nrmse, 4) if nrmse is not None else None,
    )


def _pearson_correlation(x: list[float], y: list[float]) -> Optional[float]:
    """Pearson correlation coefficient. Returns None if constant series."""
    n = len(x)
    if n < 2:
        return None

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    cov = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    var_x = sum((x[i] - mean_x) ** 2 for i in range(n))
    var_y = sum((y[i] - mean_y) ** 2 for i in range(n))

    denom = math.sqrt(var_x * var_y)
    if denom < 1e-15:
        return None  # At least one series is constant

    return cov / denom


def _r_squared(predicted: list[float], actual: list[float]) -> Optional[float]:
    """
    R-squared (coefficient of determination).
    R^2 = 1 - SS_res / SS_tot
    where SS_tot is computed from the actual (reference) series.
    """
    n = len(actual)
    if n < 2:
        return None

    mean_actual = sum(actual) / n
    ss_tot = sum((actual[i] - mean_actual) ** 2 for i in range(n))
    ss_res = sum((actual[i] - predicted[i]) ** 2 for i in range(n))

    if ss_tot < 1e-15:
        return None  # Constant reference series

    return 1.0 - (ss_res / ss_tot)


# ── Status classification ───────────────────────────────────────────────────

# Default thresholds
NRMSE_THRESHOLD_PERCENT = 5.0  # 5% acceptance criterion
MAE_THRESHOLD_C = 1.0          # Absolute fallback
R_SQUARED_THRESHOLD = 0.95     # Minimum R^2


def classify_validation_status(
    metrics: ValidationMetrics,
    dataset_source: str,
    nrmse_threshold: float = NRMSE_THRESHOLD_PERCENT,
) -> ValidationStatus:
    """
    Determine validation status based on metrics and data source.

    VERIFIED requires:
      1. Real ANSYS data (not a test fixture)
      2. NRMSE < threshold
    """
    is_real_ansys = "ANSYS" in dataset_source.upper()

    if not is_real_ansys:
        return ValidationStatus.FIXTURE_ONLY

    if metrics.normalized_rmse_percent is None:
        return ValidationStatus.FAILED

    if metrics.normalized_rmse_percent < nrmse_threshold:
        return ValidationStatus.VERIFIED
    else:
        return ValidationStatus.FAILED


def run_benchmark_validation(
    case_id: str,
    thermashell_timestamps_s: list[float],
    thermashell_temperatures_c: list[float],
    reference_timestamps_s: list[float],
    reference_temperatures_c: list[float],
    source: str = "TEST_FIXTURE",
    nrmse_threshold: float = NRMSE_THRESHOLD_PERCENT,
) -> ValidationResult:
    """
    Execute end-to-end benchmark validation between THERMASHELL output and a reference curve.
    Aligns both series, computes all metrics, and classifies status honestly.
    """
    try:
        common_times, aligned_ts, aligned_ref, alignment = align_time_series(
            thermashell_timestamps_s, thermashell_temperatures_c,
            reference_timestamps_s, reference_temperatures_c,
        )
        metrics = calculate_validation_metrics(aligned_ts, aligned_ref, common_times)
        status = classify_validation_status(metrics, source, nrmse_threshold)
        return ValidationResult(
            case_id=case_id,
            source=source,
            status=status,
            metrics=metrics,
            alignment=alignment,
            thermashell_timestamps_s=common_times,
            thermashell_temperatures_c=aligned_ts,
            reference_timestamps_s=common_times,
            reference_temperatures_c=aligned_ref,
        )
    except Exception as e:
        return ValidationResult(
            case_id=case_id,
            source=source,
            status=ValidationStatus.FAILED,
            metrics=None,
            alignment=None,
            thermashell_timestamps_s=thermashell_timestamps_s,
            thermashell_temperatures_c=thermashell_temperatures_c,
            reference_timestamps_s=reference_timestamps_s,
            reference_temperatures_c=reference_temperatures_c,
            error=str(e),
        )

