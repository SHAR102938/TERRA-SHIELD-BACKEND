
from fastapi import APIRouter, HTTPException
from app.data.materials import get_all_materials, get_material_by_id
from typing import List, Dict, Any

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
def get_materials():
    return get_all_materials()

@router.get("/{material_id}", response_model=Dict[str, Any])
def get_material(material_id: int):
    material = get_material_by_id(material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return material