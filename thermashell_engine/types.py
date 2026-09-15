"""
Pydantic v2 data models for the THERMASHELL thermal engine.

All I/O between engine modules uses these types.
No web/API dependencies — pure data contracts.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

import numpy as np
from pydantic import BaseModel, Field, field_validator


# ── Enums ────────────────────────────────────────────────────────────────

class RoofType(str, Enum):
    FLAT = "flat"
    GABLE = "gable"
    SHED = "shed"
    HIP = "hip"


class HVACMode(str, Enum):
    FREE_RUNNING = "free_running"
    HEATED = "heated"
    COOLED = "cooled"
    MIXED = "mixed"


class ComfortModel(str, Enum):
    FANGER = "fanger"
    ADAPTIVE = "adaptive"


# ── Geometry ─────────────────────────────────────────────────────────────

class ShelterGeometry(BaseModel):
    """Rectangular shelter geometry with roof."""
    length: float = Field(..., gt=0, description="Length in meters")
    width: float = Field(..., gt=0, description="Width in meters")
    height: float = Field(..., gt=0, description="Wall height in meters")
    roof_type: RoofType = RoofType.GABLE
    roof_pitch_deg: float = Field(default=15.0, ge=0, le=60, description="Roof pitch in degrees")
    orientation_deg: float = Field(default=0.0, ge=0, lt=360, description="Orientation: 0=N, 90=E, 180=S, 270=W")
    elevation_m: float = Field(default=0.0, ge=0, description="Site elevation above sea level in meters")

    @property
    def floor_area(self) -> float:
        """Floor area in m²."""
        return self.length * self.width

    @property
    def wall_area_total(self) -> float:
        """Total wall area in m² (4 walls, no openings deducted)."""
        return 2 * (self.length + self.width) * self.height

    @property
    def volume(self) -> float:
        """Internal volume in m³ (rectangular only, ignoring roof volume)."""
        return self.length * self.width * self.height

    @property
    def roof_area(self) -> float:
        """Roof area in m² accounting for pitch."""
        import math
        if self.roof_type == RoofType.FLAT:
            return self.floor_area
        cos_pitch = math.cos(math.radians(self.roof_pitch_deg))
        if cos_pitch == 0:
            return self.floor_area
        return self.floor_area / cos_pitch


# ── Materials & Envelope ─────────────────────────────────────────────────

class MaterialLayer(BaseModel):
    """A single material layer in a wall/roof/floor assembly."""
    name: str
    thickness_m: float = Field(..., gt=0, description="Thickness in meters")
    conductivity: float = Field(..., gt=0, description="Thermal conductivity λ in W/(m·K)")
    density: float = Field(..., gt=0, description="Density in kg/m³")
    specific_heat: float = Field(..., gt=0, description="Specific heat capacity in J/(kg·K)")

    @property
    def r_value(self) -> float:
        """Thermal resistance R = thickness / conductivity in m²·K/W."""
        return self.thickness_m / self.conductivity

    @property
    def thermal_mass(self) -> float:
        """Thermal capacity per unit area in J/(m²·K)."""
        return self.density * self.specific_heat * self.thickness_m


class WallAssembly(BaseModel):
    """Ordered stack of material layers for a wall, roof, or floor."""
    name: str
    layers: list[MaterialLayer] = Field(..., min_length=1)

    @property
    def total_r_value(self) -> float:
        """Total thermal resistance of all layers in m²·K/W."""
        return sum(layer.r_value for layer in self.layers)

    @property
    def u_value(self) -> float:
        """Overall U-value in W/(m²·K) including surface resistances.
        Uses standard interior (0.13) and exterior (0.04) surface resistances."""
        R_si = 0.13  # Interior surface resistance
        R_se = 0.04  # Exterior surface resistance
        R_total = R_si + self.total_r_value + R_se
        return 1.0 / R_total

    @property
    def total_thickness_m(self) -> float:
        return sum(layer.thickness_m for layer in self.layers)


class Opening(BaseModel):
    """Window or door opening."""
    name: str = "Window"
    width_m: float = Field(..., gt=0)
    height_m: float = Field(..., gt=0)
    wall_face: str = Field(default="south", description="Which wall: north, south, east, west")
    u_value: float = Field(default=5.7, gt=0, description="Glazing U-value in W/(m²·K)")
    shgc: float = Field(default=0.76, ge=0, le=1, description="Solar heat gain coefficient")
    count: int = Field(default=1, ge=1)

    @property
    def area(self) -> float:
        return self.width_m * self.height_m * self.count


class Envelope(BaseModel):
    """Complete building envelope: walls, roof, floor, openings."""
    walls: WallAssembly
    roof: WallAssembly
    floor: WallAssembly
    openings: list[Opening] = Field(default_factory=list)

    @property
    def net_wall_area(self) -> float:
        """This is approximate — needs geometry context for full calculation."""
        total_opening = sum(o.area for o in self.openings)
        return max(0, 0)  # Placeholder — computed in simulation with geometry


# ── Climate ──────────────────────────────────────────────────────────────

class ClimateTimeseries(BaseModel):
    """Hourly climate data for simulation."""
    timestamps: list[str] = Field(..., description="ISO-format timestamps")
    temperature_c: list[float] = Field(..., description="Outdoor dry-bulb temperature °C")
    relative_humidity: list[float] = Field(..., description="Relative humidity %")
    wind_speed_ms: list[float] = Field(..., description="Wind speed m/s at 10m")
    wind_direction_deg: list[float] = Field(default_factory=list, description="Wind direction degrees")
    solar_ghi: list[float] = Field(..., description="Global horizontal irradiance W/m²")
    solar_dni: list[float] = Field(default_factory=list, description="Direct normal irradiance W/m²")
    solar_dhi: list[float] = Field(default_factory=list, description="Diffuse horizontal irradiance W/m²")
    pressure_kpa: list[float] = Field(default_factory=list, description="Surface pressure kPa")

    @field_validator("temperature_c", "relative_humidity", "wind_speed_ms", "solar_ghi")
    @classmethod
    def check_non_empty(cls, v: list) -> list:
        if len(v) == 0:
            raise ValueError("Timeseries must contain at least one data point")
        return v

    @property
    def n_hours(self) -> int:
        return len(self.timestamps)


# ── Simulation Config ────────────────────────────────────────────────────

class SimulationConfig(BaseModel):
    """Complete specification for a thermal simulation run."""
    geometry: ShelterGeometry
    envelope: Envelope
    climate: ClimateTimeseries
    # Operating conditions
    occupants: int = Field(default=4, ge=0)
    metabolic_rate_w: float = Field(default=100.0, gt=0, description="Per-person metabolic rate in W")
    internal_gains_w: float = Field(default=200.0, ge=0, description="Equipment/lighting heat gain in W")
    target_temp_c: float = Field(default=18.0, description="Target indoor temperature °C")
    comfort_band_c: float = Field(default=2.0, ge=0, description="±Comfort band in °C")
    hvac_mode: HVACMode = HVACMode.FREE_RUNNING
    ach_natural: float = Field(default=0.5, ge=0, description="Natural air changes per hour")
    ach_infiltration: float = Field(default=0.3, ge=0, description="Infiltration air changes per hour")
    # Simulation parameters
    timestep_s: int = Field(default=3600, gt=0, description="Simulation timestep in seconds")
    comfort_model: ComfortModel = ComfortModel.FANGER


# ── Results ──────────────────────────────────────────────────────────────

class HeatBalanceBreakdown(BaseModel):
    """Heat balance components over simulation period."""
    conduction_walls_kwh: float = 0.0
    conduction_roof_kwh: float = 0.0
    conduction_floor_kwh: float = 0.0
    conduction_windows_kwh: float = 0.0
    solar_gain_kwh: float = 0.0
    internal_gain_kwh: float = 0.0
    ventilation_kwh: float = 0.0
    infiltration_kwh: float = 0.0
    heating_energy_kwh: float = 0.0
    cooling_energy_kwh: float = 0.0

    @property
    def total_gain_kwh(self) -> float:
        return self.solar_gain_kwh + self.internal_gain_kwh + self.heating_energy_kwh

    @property
    def total_loss_kwh(self) -> float:
        return (abs(self.conduction_walls_kwh) + abs(self.conduction_roof_kwh) +
                abs(self.conduction_floor_kwh) + abs(self.conduction_windows_kwh) +
                abs(self.ventilation_kwh) + abs(self.infiltration_kwh) +
                abs(self.cooling_energy_kwh))


class ComfortMetrics(BaseModel):
    """Thermal comfort assessment results."""
    pmv_mean: float = 0.0
    ppd_mean: float = 0.0
    comfort_hours: int = 0
    total_hours: int = 0
    comfort_percentage: float = 0.0
    operative_temp_mean_c: float = 0.0
    hours_below_comfort: int = 0
    hours_above_comfort: int = 0


class SimulationResult(BaseModel):
    """Complete output from a transient thermal simulation."""
    # Timeseries results
    timestamps: list[str]
    indoor_temp_c: list[float]
    outdoor_temp_c: list[float]
    operative_temp_c: list[float]
    wall_inner_surface_temp_c: list[float]
    wall_outer_surface_temp_c: list[float]
    roof_inner_surface_temp_c: list[float]
    # Heat flows per timestep (W)
    q_conduction_walls: list[float]
    q_conduction_roof: list[float]
    q_conduction_floor: list[float]
    q_solar_gain: list[float]
    q_ventilation: list[float]
    q_internal: list[float]
    q_hvac: list[float]
    # Aggregates
    heat_balance: HeatBalanceBreakdown
    comfort: ComfortMetrics
    # Metadata
    simulation_hours: int
    timestep_s: int
    peak_heating_load_w: float = 0.0
    peak_cooling_load_w: float = 0.0


# ── Optimization ─────────────────────────────────────────────────────────

class OptimizationCandidate(BaseModel):
    """A single design variant evaluated during optimization."""
    design_id: str
    parameters: dict  # Changed parameter values
    energy_kwh: float
    comfort_percentage: float
    estimated_cost_factor: float = 1.0
    score: float = 0.0  # Weighted composite score
    is_pareto_optimal: bool = False


class ParetoFrontier(BaseModel):
    """Result of a parametric optimization."""
    candidates: list[OptimizationCandidate]
    pareto_optimal: list[OptimizationCandidate]
    recommended: Optional[OptimizationCandidate] = None
    recommendation_reason: str = ""
    total_evaluated: int = 0
