"""
API v1 Validation Router — benchmark listings, validation execution, and ANSYS status.
"""

from typing import Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel

from app.api.routes.validation import (
    run_validation as app_run_validation,
    list_benchmarks as app_list_benchmarks,
    get_ansys_status as app_get_ansys_status,
    ValidationRequest,
)

router = APIRouter()


@router.get("/benchmarks")
def list_benchmarks() -> Dict[str, Any]:
    """List all available validation benchmarks (analytical and ANSYS datasets)."""
    return app_list_benchmarks()


@router.get("/ansys-status")
def get_ansys_status() -> Dict[str, Any]:
    """Return explicit provenance and readiness status of the ANSYS validation subsystem."""
    return app_get_ansys_status()


@router.post("")
def run_validation(request: ValidationRequest) -> Dict[str, Any]:
    """Execute benchmark comparison against analytical solution or ANSYS reference dataset."""
    return app_run_validation(request)
