"""API v1 router — aggregates all sub-routers."""

from fastapi import APIRouter
from api.v1.climate import router as climate_router
from api.v1.materials import router as materials_router
from api.v1.simulations import router as simulations_router
from api.v1.projects import router as projects_router
from api.v1.optimization import router as optimization_router

api_router = APIRouter()
api_router.include_router(climate_router, prefix="/climate", tags=["Climate"])
api_router.include_router(materials_router, prefix="/materials", tags=["Materials"])
api_router.include_router(simulations_router, prefix="/simulations", tags=["Simulations"])
api_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_router.include_router(optimization_router, prefix="/optimization", tags=["Optimization"])
