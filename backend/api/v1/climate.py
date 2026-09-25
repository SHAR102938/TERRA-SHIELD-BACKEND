"""
Climate data API endpoint — proxies NASA POWER with caching.

GET /api/v1/climate/power?lat=...&lon=...&start=...&end=...&params=...
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.climate_service import fetch_climate_data

router = APIRouter()


@router.get("/power")
async def get_climate_data(
    lat: float = Query(..., ge=-90, le=90, description="Latitude °N"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude °E"),
    start: str = Query(..., min_length=8, max_length=8, description="Start date YYYYMMDD"),
    end: str = Query(..., min_length=8, max_length=8, description="End date YYYYMMDD"),
    params: str = Query(
        default="T2M,RH2M,WS10M,ALLSKY_SFC_SW_DWN",
        description="Comma-separated NASA POWER parameters (max 15)"
    ),
    community: str = Query(default="SB", description="NASA POWER community: SB, RE, AG"),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch hourly climate data from NASA POWER.

    Responses include a `_cache` object indicating:
    - `hit`: whether this was served from cache
    - `is_fallback`: whether demo/fallback data was used (NASA POWER unavailable)

    When fallback is used, the `source` field clearly indicates:
    "DEMO/FALLBACK — LEH-WINTER-72H (NASA POWER unavailable)"
    """
    data = await fetch_climate_data(
        db=db,
        latitude=lat,
        longitude=lon,
        start_date=start,
        end_date=end,
        parameters=params,
        community=community,
    )
    return data
