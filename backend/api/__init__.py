"""API v1 router — aggregates all sub-routers."""

from fastapi import APIRouter
from api.v1.climate import router as climate_router

api_router = APIRouter()
api_router.include_router(climate_router, prefix="/climate", tags=["Climate"])
