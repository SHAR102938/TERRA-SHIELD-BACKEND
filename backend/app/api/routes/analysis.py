
from fastapi import APIRouter, HTTPException
from app.models.analysis import (
    AnalysisInput, AnalysisResponse, ThermalSummary, ComfortResults
)
from app.models.climate import ClimateData
from app.services.geometry_engine import calculate_geometry
from app.data.materials import get_material_by_id
from app.services.climate_service import get_climate_data
from app.services.thermal_engine import run_thermal_simulation
from app.services.comfort_engine import calculate_comfort_score, summarize_simulation_results

router = APIRouter()

@router.post("/run", response_model=AnalysisResponse)
def run_analysis(input: AnalysisInput):
    try:
        # 1. Calculate Geometry
        geometry_values = calculate_geometry(
            length=input.geometry.length,
            width=input.geometry.width,
            height=input.geometry.height,
            roof_pitch=input.geometry.roof_pitch,
        )

        # 2. Load Material
        material = get_material_by_id(input.material_id)
        if not material:
            raise HTTPException(status_code=404, detail=f"Material with id {input.material_id} not found")

        # 3. Fetch Climate Data
        climate_data = get_climate_data(
            latitude=input.location.latitude,
            longitude=input.location.longitude,
        )

        # 4. Run Thermal Simulation
        time_series = run_thermal_simulation(
            geometry=geometry_values,
            material=material,
            climate=climate_data,
            operating_conditions=input.operating_conditions.dict(),
            simulation_params=input.simulation.dict(),
        )
        
        if not time_series:
            raise HTTPException(status_code=500, detail="Thermal simulation failed to produce results.")

        # 5. Summarize Results and Calculate Comfort
        thermal_summary = summarize_simulation_results(time_series)
        comfort_results = calculate_comfort_score(
            time_series=time_series,
            target_temperature=input.operating_conditions.target_temperature,
            comfort_band=input.comfort.comfort_band,
        )

        return AnalysisResponse(
            geometry=input.geometry,
            material=material,
            location=input.location,
            climate=ClimateData(**climate_data),
            simulation=input.simulation,
            thermal_summary=ThermalSummary(**thermal_summary),
            comfort=ComfortResults(**comfort_results),
            time_series=time_series,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        raise e
    except Exception as e:
        # It's good practice to log the error here
        # import logging
        # logging.exception("An unexpected error occurred during analysis")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")