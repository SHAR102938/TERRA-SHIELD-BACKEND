
from fastapi import APIRouter, Query, HTTPException
from app.models.climate import ClimateResponse, Location, ClimateData
from app.services.climate_service import get_climate_data as get_climate_data_service

router = APIRouter()

@router.get("", response_model=ClimateResponse)
def get_climate(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
):
    try:
        climate_data = get_climate_data_service(latitude, longitude)
        return ClimateResponse(
            location=Location(latitude=latitude, longitude=longitude),
            climate=ClimateData(**climate_data)
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))