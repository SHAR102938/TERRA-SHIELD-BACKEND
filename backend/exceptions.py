"""Typed exception taxonomy for structured error responses."""

from __future__ import annotations


class ThermashellError(Exception):
    """Base exception for all THERMASHELL errors."""
    error_code: str = "INTERNAL_ERROR"
    status_code: int = 500
    fallback_used: bool = False

    def __init__(self, message: str, fallback_used: bool = False):
        self.message = message
        self.fallback_used = fallback_used
        super().__init__(message)

    def to_dict(self) -> dict:
        return {
            "error_code": self.error_code,
            "message": self.message,
            "fallback_used": self.fallback_used,
        }


class ClimateSourceUnavailable(ThermashellError):
    error_code = "CLIMATE_SOURCE_UNAVAILABLE"
    status_code = 503


class InvalidGeometryError(ThermashellError):
    error_code = "INVALID_GEOMETRY"
    status_code = 422


class InvalidEnvelopeError(ThermashellError):
    error_code = "INVALID_ENVELOPE"
    status_code = 422


class SimulationTimeoutError(ThermashellError):
    error_code = "SIMULATION_TIMEOUT"
    status_code = 504


class SimulationFailedError(ThermashellError):
    error_code = "SIMULATION_FAILED"
    status_code = 500


class OptimizationInfeasibleError(ThermashellError):
    error_code = "OPTIMIZATION_INFEASIBLE"
    status_code = 422


class ResourceNotFoundError(ThermashellError):
    error_code = "NOT_FOUND"
    status_code = 404
