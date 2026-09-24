
from pydantic import BaseModel, Field

class GeometryInput(BaseModel):
    geometry_type: str = "gable_roof"
    length: float = Field(..., gt=0, le=50)
    width: float = Field(..., gt=0, le=50)
    height: float = Field(..., gt=0, le=10)
    roof_pitch: float = Field(..., ge=0, le=60)
    orientation: float = Field(..., ge=0, le=359)

class CalculatedGeometry(BaseModel):
    floor_area: float
    wall_area: float
    roof_area: float
    envelope_area: float
    roof_slope: float
    roof_rise: float
    total_height: float
    volume: float

class GeometryResponse(BaseModel):
    geometry: GeometryInput
    calculated: CalculatedGeometry