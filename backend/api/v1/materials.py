"""
Materials catalog and envelope thermal calculator API endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from thermashell_engine.types import MaterialLayer, WallAssembly
from thermashell_engine.conduction import compute_r_value, compute_u_value, thermal_capacity_per_area

router = APIRouter()


class MaterialItem(BaseModel):
    id: str
    name: string if False else str
    category: str
    conductivity: float = Field(..., description="Thermal conductivity k (W/m·K)")
    density: float = Field(..., description="Density (kg/m³)")
    specific_heat: float = Field(..., description="Specific heat capacity c_p (J/kg·K)")
    embodiement_category: str = "Standard"
    typical_thickness_mm: int = 50
    demo_data: bool = False


# Curated catalog of tested construction materials for extreme climate shelters
MATERIALS_CATALOG: List[MaterialItem] = [
    MaterialItem(id="stone-masonry", name="Stone Masonry (Granite/Gneiss)", category="Masonry", conductivity=1.50, density=2500, specific_heat=900, typical_thickness_mm=300),
    MaterialItem(id="sandstone", name="Sandstone (Jaisalmer / Arid)", category="Masonry", conductivity=1.70, density=2200, specific_heat=920, typical_thickness_mm=250),
    MaterialItem(id="burnt-brick", name="Burnt Clay Brick Masonry", category="Masonry", conductivity=0.84, density=1800, specific_heat=840, typical_thickness_mm=230),
    MaterialItem(id="rammed-earth", name="Stabilized Rammed Earth / Mud", category="Masonry", conductivity=0.75, density=1750, specific_heat=880, typical_thickness_mm=300),
    MaterialItem(id="aac-block", name="Autoclaved Aerated Concrete (AAC)", category="Masonry", conductivity=0.16, density=550, specific_heat=1000, typical_thickness_mm=200),
    MaterialItem(id="dense-concrete", name="Reinforced Concrete (RCC)", category="Structure", conductivity=1.40, density=2300, specific_heat=880, typical_thickness_mm=150),
    MaterialItem(id="cement-plaster", name="Cement Sand Plaster (1:4)", category="Finish", conductivity=0.72, density=1600, specific_heat=840, typical_thickness_mm=15),
    MaterialItem(id="lime-plaster", name="Lime Surkhi Plaster", category="Finish", conductivity=0.70, density=1600, specific_heat=840, typical_thickness_mm=20),
    MaterialItem(id="eps-insulation", name="Expanded Polystyrene (EPS)", category="Insulation", conductivity=0.035, density=25, specific_heat=1400, typical_thickness_mm=100),
    MaterialItem(id="xps-insulation", name="Extruded Polystyrene (XPS)", category="Insulation", conductivity=0.034, density=35, specific_heat=1400, typical_thickness_mm=80),
    MaterialItem(id="rockwool", name="Mineral Rockwool Slab", category="Insulation", conductivity=0.038, density=80, specific_heat=1030, typical_thickness_mm=100),
    MaterialItem(id="glass-wool", name="Glass Wool Batts", category="Insulation", conductivity=0.040, density=24, specific_heat=960, typical_thickness_mm=100),
    MaterialItem(id="puf-board", name="Polyurethane Rigid Foam (PIR/PUR)", category="Insulation", conductivity=0.024, density=40, specific_heat=1400, typical_thickness_mm=75),
    MaterialItem(id="mud-phuska", name="Mud Phuska (Traditional Roof Insulation)", category="Insulation", conductivity=0.52, density=1622, specific_heat=880, typical_thickness_mm=150),
    MaterialItem(id="cgi-sheet", name="Corrugated Galvanized Iron (CGI)", category="Roofing", conductivity=50.0, density=7850, specific_heat=500, typical_thickness_mm=2),
    MaterialItem(id="timber-plywood", name="Commercial Plywood / Timber", category="Wood", conductivity=0.13, density=550, specific_heat=1700, typical_thickness_mm=18),
]


class LayerInput(BaseModel):
    material_id: Optional[str] = None
    name: str
    thickness_mm: float = Field(..., gt=0)
    conductivity: float = Field(..., gt=0)
    density: float = Field(default=1000.0, gt=0)
    specific_heat: float = Field(default=1000.0, gt=0)


class AssemblyEvaluationRequest(BaseModel):
    surface_type: str = Field(default="wall", description="'wall', 'roof', or 'floor'")
    layers: List[LayerInput]


class AssemblyEvaluationResponse(BaseModel):
    r_value: float = Field(..., description="Total thermal resistance R (m²·K/W)")
    u_value: float = Field(..., description="Overall heat transfer coefficient U (W/m²·K)")
    thermal_capacity: float = Field(..., description="Areal thermal capacity (kJ/m²·K)")
    layer_count: int


@router.get("", response_model=List[MaterialItem])
async def list_materials(category: Optional[str] = Query(None, description="Filter by category")):
    """Returns catalog of thermal construction materials."""
    if category:
        return [m for m in MATERIALS_CATALOG if m.category.lower() == category.lower()]
    return MATERIALS_CATALOG


@router.post("/evaluate", response_model=AssemblyEvaluationResponse)
async def evaluate_assembly(req: AssemblyEvaluationRequest):
    """Computes R-value, U-value, and areal thermal capacitance for a composite envelope."""
    engine_layers = [
        MaterialLayer(
            name=l.name,
            thickness_m=l.thickness_mm / 1000.0,
            conductivity=l.conductivity,
            density=l.density,
            specific_heat=l.specific_heat,
        )
        for l in req.layers
    ]
    assembly = WallAssembly(name="Custom Assembly", layers=engine_layers)
    r_val = compute_r_value(assembly, req.surface_type)
    u_val = compute_u_value(assembly, req.surface_type)
    c_val = thermal_capacity_per_area(assembly) / 1000.0  # kJ/m²K

    return AssemblyEvaluationResponse(
        r_value=round(r_val, 4),
        u_value=round(u_val, 4),
        thermal_capacity=round(c_val, 2),
        layer_count=len(engine_layers)
    )
