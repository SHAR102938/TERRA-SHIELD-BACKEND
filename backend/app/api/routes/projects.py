from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.db_models import Project
from typing import List, Dict, Any
from pydantic import BaseModel
import json

router = APIRouter()

class ProjectCreate(BaseModel):
    id: str
    name: str
    description: str = ""
    climate_zone: str = "Unknown"
    location_name: str
    latitude: float
    longitude: float
    elevation: float = 0
    scenario_data: str = "{}"

class ProjectResponse(ProjectCreate):
    status: str

@router.post("", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project
