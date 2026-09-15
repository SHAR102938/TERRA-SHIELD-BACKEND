"""
Projects and Preset Scenarios API endpoint.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Curated benchmark / preset shelter projects for different Indian extreme climate zones
PRESET_PROJECTS = [
    {
        "id": "leh-winter-demo",
        "name": "Leh High-Altitude Winter Outpost",
        "description": "Critical cold defense shelter at 3,500m elevation. Extreme diurnal swings with sub-zero design extremes (-15°C) and high solar clear-sky insolation.",
        "location": {
            "name": "Leh, Ladakh",
            "latitude": 34.15,
            "longitude": 77.58,
            "elevation": 3500.0,
            "climate_zone": "Cold and Sunny (High Altitude)"
        },
        "geometry": {"length": 6.0, "width": 4.0, "height": 3.0, "orientation": 180.0, "roof_type": "gable"},
        "envelope_summary": "300mm Stone + 100mm EPS Insulation, 120mm XPS Roof, Double Low-E South Windows",
        "baseline_energy_kwh": 38.6,
        "comfort_percentage": 75.0,
    },
    {
        "id": "jaisalmer-hot-arid",
        "name": "Thar Desert Arid Deployment",
        "description": "High thermal mass construction designed to delay diurnal solar flux penetration in hot-dry desert climates with 45°C ambient peaks.",
        "location": {
            "name": "Jaisalmer, Rajasthan",
            "latitude": 26.91,
            "longitude": 70.90,
            "elevation": 225.0,
            "climate_zone": "Hot and Dry"
        },
        "geometry": {"length": 7.0, "width": 5.0, "height": 3.2, "orientation": 0.0, "roof_type": "flat"},
        "envelope_summary": "250mm Yellow Sandstone + Mud Phuska Roof + Deep Overhang Shading",
        "baseline_energy_kwh": 62.4,
        "comfort_percentage": 68.0,
    },
    {
        "id": "tawang-subalpine",
        "name": "Tawang Mountain High-Humidity Post",
        "description": "Damp cold high-elevation outpost with freezing rain, mist, and persistent overcast skies. High airtightness and continuous moisture barrier required.",
        "location": {
            "name": "Tawang, Arunachal Pradesh",
            "latitude": 27.58,
            "longitude": 91.86,
            "elevation": 3048.0,
            "climate_zone": "Cold and Cloudy"
        },
        "geometry": {"length": 6.0, "width": 4.5, "height": 2.8, "orientation": 135.0, "roof_type": "shed"},
        "envelope_summary": "AAC Block + 120mm Rockwool + Timber Siding + Steep CGI Roof",
        "baseline_energy_kwh": 51.2,
        "comfort_percentage": 72.0,
    }
]


@router.get("", response_model=List[Dict[str, Any]])
async def list_preset_projects():
    """Returns preset engineering scenarios for demonstration and rapid benchmarking."""
    return PRESET_PROJECTS


@router.get("/{project_id}", response_model=Dict[str, Any])
async def get_project(project_id: str):
    """Returns details of a specific preset or saved project."""
    for p in PRESET_PROJECTS:
        if p["id"] == project_id:
            return p
    return PRESET_PROJECTS[0]
