"""
Parametric optimization API endpoint — computes Pareto frontier and design variants.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from thermashell_engine.optimizer import run_optimization
from api.v1.simulations import RunSimulationPayload, _build_engine_config

router = APIRouter()


class OptimizationRequest(BaseModel):
    base_scenario: RunSimulationPayload
    insulation_thicknesses_m: Optional[List[float]] = [0.04, 0.08, 0.12, 0.16]
    window_u_values: Optional[List[float]] = [5.7, 2.8, 1.4]
    ach_values: Optional[List[float]] = [0.3, 0.5]
    w_energy: float = 0.4
    w_comfort: float = 0.4
    w_cost: float = 0.2
    max_candidates: int = 24


@router.post("/sweep")
async def run_parametric_sweep(req: OptimizationRequest) -> Dict[str, Any]:
    """
    Executes a deterministic parametric sweep and returns candidates + Pareto frontier.
    """
    try:
        base_cfg = _build_engine_config(req.base_scenario)
        frontier = run_optimization(
            base_config=base_cfg,
            insulation_thicknesses=req.insulation_thicknesses_m,
            window_u_values=req.window_u_values,
            ach_values=req.ach_values,
            w_energy=req.w_energy,
            w_comfort=req.w_comfort,
            w_cost=req.w_cost,
            max_candidates=req.max_candidates,
        )
        return frontier.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")
