"""
POST /api/optimize

Request → candidate generation → parallel thermal simulations
→ feasibility filter → scoring → ranking → full ranked list.

The scoring weights and feasibility threshold are visible in the
response under `meta` so the user can see exactly how results were scored.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.services.climate_service import get_climate_data
from app.services.optimizer import run_optimization
from app.config.optimization_config import DEFAULT_WEIGHTS

router = APIRouter()


# ── Request schema ────────────────────────────────────────────────────────────

class OptimizeGeometry(BaseModel):
    length: float = Field(6.0, gt=0)
    width:  float = Field(4.0, gt=0)
    height: float = Field(3.0, gt=0)

class OptimizeLocation(BaseModel):
    latitude:  float
    longitude: float

class OptimizeOperating(BaseModel):
    target_temperature:        float = 18.0
    initial_indoor_temperature: float = 18.0
    occupants:                 int   = 4
    heat_per_person:           float = 50.0
    air_changes_per_hour:      float = 0.5

class OptimizeParamRanges(BaseModel):
    material_ids: List[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5, 6])
    thicknesses:  List[float] = Field(default_factory=lambda: [0.05, 0.10, 0.15, 0.20])
    roof_pitches: List[float] = Field(default_factory=lambda: [5.0, 15.0, 30.0])

class ScoringWeights(BaseModel):
    comfort: float = Field(DEFAULT_WEIGHTS["comfort"], ge=0)
    energy:  float = Field(DEFAULT_WEIGHTS["energy"],  ge=0)
    weight:  float = Field(DEFAULT_WEIGHTS["weight"],  ge=0)
    cost:    float = Field(DEFAULT_WEIGHTS["cost"],    ge=0)

class OptimizeRequest(BaseModel):
    geometry:           OptimizeGeometry    = OptimizeGeometry()
    location:           OptimizeLocation
    operating:          OptimizeOperating   = OptimizeOperating()
    comfort_band:       float               = Field(2.0, gt=0)
    simulation_hours:   int                 = Field(72, gt=0, le=168)
    param_ranges:       OptimizeParamRanges = OptimizeParamRanges()
    weights:            ScoringWeights      = ScoringWeights()


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("")
def optimize(request: OptimizeRequest) -> Dict[str, Any]:
    try:
        # Fetch climate data once — shared across all candidates
        climate = get_climate_data(
            latitude=request.location.latitude,
            longitude=request.location.longitude,
        )

        result = run_optimization(
            base_geometry={
                "length": request.geometry.length,
                "width":  request.geometry.width,
                "height": request.geometry.height,
                "roof_pitch": 15.0,  # base; overridden per candidate
            },
            location={"latitude": request.location.latitude, "longitude": request.location.longitude},
            climate=climate,
            operating_conditions={
                "target_temperature":         request.operating.target_temperature,
                "initial_indoor_temperature": request.operating.initial_indoor_temperature,
                "occupants":                  request.operating.occupants,
                "heat_per_person":            request.operating.heat_per_person,
                "air_changes_per_hour":       request.operating.air_changes_per_hour,
            },
            simulation_params={
                "duration_hours":  request.simulation_hours,
                "timestep_hours":  1.0,
            },
            comfort_config={
                "target_temperature": request.operating.target_temperature,
                "comfort_band":       request.comfort_band,
            },
            param_ranges={
                "material_ids": request.param_ranges.material_ids,
                "thicknesses":  request.param_ranges.thicknesses,
                "roof_pitches": request.param_ranges.roof_pitches,
            },
            weights=request.weights.dict(),
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("Optimization failed")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {e}")
