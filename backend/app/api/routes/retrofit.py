"""
Retrofit API Route
==================
POST /api/retrofit/evaluate
Evaluates and ranks discrete thermal retrofits for existing structures (Feature B).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from app.services.climate_service import get_climate_data
from app.services.retrofit_engine import evaluate_retrofit_options

router = APIRouter()


class RetrofitGeometry(BaseModel):
    length: float = Field(6.0, gt=0)
    width: float = Field(4.0, gt=0)
    height: float = Field(3.0, gt=0)
    roof_pitch: float = Field(15.0, ge=0)


class RetrofitLocation(BaseModel):
    latitude: float
    longitude: float


class RetrofitOperating(BaseModel):
    target_temperature: float = 18.0
    initial_indoor_temperature: float = 18.0
    occupants: int = 4
    heat_per_person: float = 50.0
    air_changes_per_hour: float = 1.2  # Uninsulated structures typically leakier


class RetrofitRequest(BaseModel):
    geometry: RetrofitGeometry = RetrofitGeometry()
    location: RetrofitLocation
    operating: RetrofitOperating = RetrofitOperating()
    comfort_band: float = Field(2.0, gt=0)
    simulation_hours: int = Field(72, gt=0, le=168)
    baseline_material_id: int = Field(6, description="Material ID of current structure, default 6 (Concrete/Stone)")


@router.post("/evaluate")
def evaluate_retrofit(request: RetrofitRequest) -> Dict[str, Any]:
    try:
        climate = get_climate_data(
            latitude=request.location.latitude,
            longitude=request.location.longitude,
        )

        results = evaluate_retrofit_options(
            geometry_params=request.geometry.model_dump(),
            location=request.location.model_dump(),
            climate=climate,
            operating_conditions=request.operating.model_dump(),
            simulation_params={
                "duration_hours": request.simulation_hours,
                "timestep_hours": 1.0,
            },
            comfort_config={
                "target_temperature": request.operating.target_temperature,
                "comfort_band": request.comfort_band,
            },
            baseline_material_id=request.baseline_material_id,
        )
        return results

    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("Retrofit evaluation failed")
        raise HTTPException(status_code=500, detail=f"Retrofit evaluation failed: {e}")
