
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from app.models.geometry import GeometryInput
from app.models.climate import Location, ClimateData

class OperatingConditions(BaseModel):
    target_temperature: float = Field(20.0, ge=-10, le=40)
    initial_indoor_temperature: float = Field(20.0, ge=-10, le=40)
    occupants: int = Field(1, ge=0)
    heat_per_person: float = Field(75.0, ge=0) # Watts
    air_changes_per_hour: float = Field(0.5, ge=0)

class SimulationParams(BaseModel):
    duration_hours: int = Field(12, gt=0)
    timestep_hours: float = Field(1.0, gt=0)

class ComfortParams(BaseModel):
    comfort_band: float = Field(3.0, ge=0)

class AnalysisInput(BaseModel):
    geometry: GeometryInput
    material_id: int
    location: Location
    operating_conditions: OperatingConditions
    simulation: SimulationParams
    comfort: ComfortParams

class ThermalSummary(BaseModel):
    min_indoor_temperature: float
    max_indoor_temperature: float
    average_indoor_temperature: float
    final_indoor_temperature: float
    min_wall_temperature: float
    max_wall_temperature: float
    min_roof_temperature: float
    max_roof_temperature: float
    total_conduction_loss: float
    total_solar_gain: float
    total_internal_heat_gain: float
    total_ventilation_loss: float

class ComfortResults(BaseModel):
    score: float
    classification: str
    percentage_time_in_comfort_range: float
    average_temperature_deviation: float

class AnalysisResponse(BaseModel):
    geometry: GeometryInput
    material: Dict[str, Any]
    location: Location
    climate: ClimateData
    simulation: SimulationParams
    thermal_summary: ThermalSummary
    comfort: ComfortResults
    time_series: List[Dict[str, Any]]