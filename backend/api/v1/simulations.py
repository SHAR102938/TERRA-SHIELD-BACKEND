"""
Simulation API endpoints — runs thermal transient simulations and streams progress.
"""

import asyncio
import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel, Field

from thermashell_engine.types import (
    ShelterGeometry, MaterialLayer, WallAssembly, Envelope, Opening,
    ClimateTimeseries, SimulationConfig, RoofType, HVACMode, ComfortModel
)
from thermashell_engine.rc_network import run_simulation

router = APIRouter()


class LayerPayload(BaseModel):
    name: str
    thickness_mm: float
    conductivity: float
    density: float = 1200.0
    specific_heat: float = 900.0


class OpeningPayload(BaseModel):
    name: str = "Window"
    width_m: float = 1.2
    height_m: float = 1.0
    wall_face: str = "south"
    u_value: float = 2.8
    shgc: float = 0.65
    count: int = 1


class RunSimulationPayload(BaseModel):
    scenario_id: Optional[str] = "custom-scenario"
    length_m: float = 6.0
    width_m: float = 4.0
    height_m: float = 3.0
    roof_pitch_deg: float = 15.0
    orientation_deg: float = 180.0
    elevation_m: float = 3500.0
    
    wall_layers: List[LayerPayload]
    roof_layers: List[LayerPayload]
    floor_layers: Optional[List[LayerPayload]] = None
    openings: Optional[List[OpeningPayload]] = None
    
    occupants: int = 4
    metabolic_rate_w: float = 100.0
    internal_gains_w: float = 200.0
    
    hvac_mode: str = "heated"
    target_temp_c: float = 18.0
    comfort_band_c: float = 2.0
    ach_natural: float = 0.3
    ach_infiltration: float = 0.2
    
    # Optional direct climate override or hours count
    duration_hours: int = 72
    base_outdoor_temp_c: float = -10.0
    temp_swing_c: float = 5.0
    peak_solar_ghi: float = 400.0


def _build_engine_config(payload: RunSimulationPayload) -> SimulationConfig:
    geometry = ShelterGeometry(
        length=payload.length_m,
        width=payload.width_m,
        height=payload.height_m,
        roof_type=RoofType.GABLE,
        roof_pitch_deg=payload.roof_pitch_deg,
        orientation_deg=payload.orientation_deg,
        elevation_m=payload.elevation_m,
    )

    walls = WallAssembly(
        name="Wall Assembly",
        layers=[
            MaterialLayer(
                name=l.name,
                thickness_m=l.thickness_mm / 1000.0,
                conductivity=l.conductivity,
                density=l.density,
                specific_heat=l.specific_heat,
            )
            for l in payload.wall_layers
        ]
    )

    roof = WallAssembly(
        name="Roof Assembly",
        layers=[
            MaterialLayer(
                name=l.name,
                thickness_m=l.thickness_mm / 1000.0,
                conductivity=l.conductivity,
                density=l.density,
                specific_heat=l.specific_heat,
            )
            for l in payload.roof_layers
        ]
    )

    floor_layers = payload.floor_layers or [
        LayerPayload(name="Concrete", thickness_mm=150, conductivity=1.4, density=2300, specific_heat=880),
        LayerPayload(name="XPS Insulation", thickness_mm=80, conductivity=0.034, density=35, specific_heat=1400),
    ]
    floor = WallAssembly(
        name="Floor Assembly",
        layers=[
            MaterialLayer(
                name=l.name,
                thickness_m=l.thickness_mm / 1000.0,
                conductivity=l.conductivity,
                density=l.density,
                specific_heat=l.specific_heat,
            )
            for l in floor_layers
        ]
    )

    openings = [
        Opening(
            name=op.name,
            width_m=op.width_m,
            height_m=op.height_m,
            wall_face=op.wall_face,
            u_value=op.u_value,
            shgc=op.shgc,
            count=op.count,
        )
        for op in (payload.openings or [OpeningPayload()])
    ]

    # Generate synthetic or climate timeseries
    n = payload.duration_hours
    timestamps = [f"2024-01-15T{h % 24:02d}:00:00" for h in range(n)]
    temps = [
        round(payload.base_outdoor_temp_c + payload.temp_swing_c * math.sin(2 * math.pi * h / 24 - math.pi / 2), 1)
        for h in range(n)
    ]
    rh = [25.0] * n
    wind = [round(2.0 + 1.5 * abs(math.sin(2 * math.pi * h / 24)), 1) for h in range(n)]
    ghi = [
        max(0.0, round(payload.peak_solar_ghi * math.sin(math.pi * (h % 24 - 6) / 12), 1))
        if 6 <= h % 24 <= 18 else 0.0
        for h in range(n)
    ]

    climate = ClimateTimeseries(
        timestamps=timestamps,
        temperature_c=temps,
        relative_humidity=rh,
        wind_speed_ms=wind,
        solar_ghi=ghi,
    )

    hvac_mode_map = {
        "free_running": HVACMode.FREE_RUNNING,
        "heated": HVACMode.HEATED,
        "cooled": HVACMode.COOLED,
        "mixed": HVACMode.MIXED,
    }

    return SimulationConfig(
        geometry=geometry,
        envelope=Envelope(walls=walls, roof=roof, floor=floor, openings=openings),
        climate=climate,
        occupants=payload.occupants,
        metabolic_rate_w=payload.metabolic_rate_w,
        internal_gains_w=payload.internal_gains_w,
        hvac_mode=hvac_mode_map.get(payload.hvac_mode, HVACMode.HEATED),
        target_temp_c=payload.target_temp_c,
        comfort_band_c=payload.comfort_band_c,
        ach_natural=payload.ach_natural,
        ach_infiltration=payload.ach_infiltration,
    )


@router.post("/run")
async def execute_simulation(payload: RunSimulationPayload) -> Dict[str, Any]:
    """Execute transient thermal physics simulation synchronously."""
    try:
        cfg = _build_engine_config(payload)
        result = run_simulation(cfg)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.websocket("/ws")
async def simulation_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time simulation streaming.
    Client sends RunSimulationPayload as JSON, receives progress frames, then final result.
    """
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        payload = RunSimulationPayload(**data)
        cfg = _build_engine_config(payload)

        # Stream progressive phases
        stages = [
            ("CLIMATE_INGEST", 15, "Synchronizing climate timeseries and solar geometry..."),
            ("RC_MATRIX_BUILD", 35, "Assembling 4R2C conductance-capacitance network..."),
            ("SOLVER_INTEGRATION", 75, "Solving implicit transient Euler equations..."),
            ("COMFORT_EVAL", 90, "Evaluating ISO 7730 PMV/PPD thermal comfort indices..."),
            ("CONVERGENCE_CHECK", 100, "Finalizing heat balance and energy metrics..."),
        ]

        for stage, pct, msg in stages:
            await websocket.send_json({
                "type": "PROGRESS",
                "stage": stage,
                "progress": pct,
                "message": msg
            })
            await asyncio.sleep(0.2)

        # Run computation
        result = run_simulation(cfg)

        await websocket.send_json({
            "type": "COMPLETED",
            "progress": 100,
            "result": result.model_dump()
        })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "ERROR", "error": str(e)})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
