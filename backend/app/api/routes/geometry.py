
from fastapi import APIRouter, HTTPException
from app.models.geometry import GeometryInput, GeometryResponse, CalculatedGeometry
from app.services.geometry_engine import calculate_geometry as calculate_geometry_engine

router = APIRouter()

@router.post("/calculate", response_model=GeometryResponse)
def calculate_geometry(input: GeometryInput):
    try:
        calculated_values = calculate_geometry_engine(
            length=input.length,
            width=input.width,
            height=input.height,
            roof_pitch=input.roof_pitch,
        )
        return GeometryResponse(
            geometry=input,
            calculated=CalculatedGeometry(**calculated_values)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))