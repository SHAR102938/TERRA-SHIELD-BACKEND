"""
THERMASHELL Engine — Pure-Python Thermal Physics for Shelter Design

Modules:
    types       — Pydantic data models for geometry, materials, climate, results
    conduction  — Multi-layer wall steady-state & transient conduction
    convection  — Interior/exterior convective heat transfer coefficients
    radiation   — Long-wave radiation exchange & solar absorption
    solar       — Solar geometry, incident radiation on tilted surfaces
    ventilation — Air change rate models & ventilation heat transfer
    comfort     — PMV/PPD (Fanger) & adaptive comfort (ASHRAE 55)
    rc_network  — Lumped-parameter RC thermal network transient solver
    optimizer   — Parametric sweep, Pareto frontier, deterministic ranking
"""

__version__ = "0.1.0"

from thermashell_engine.types import (
    ShelterGeometry,
    MaterialLayer,
    WallAssembly,
    Envelope,
    ClimateTimeseries,
    SimulationConfig,
    SimulationResult,
    ComfortMetrics,
    HeatBalanceBreakdown,
    OptimizationCandidate,
    ParetoFrontier,
)

__all__ = [
    "ShelterGeometry",
    "MaterialLayer",
    "WallAssembly",
    "Envelope",
    "ClimateTimeseries",
    "SimulationConfig",
    "SimulationResult",
    "ComfortMetrics",
    "HeatBalanceBreakdown",
    "OptimizationCandidate",
    "ParetoFrontier",
]
