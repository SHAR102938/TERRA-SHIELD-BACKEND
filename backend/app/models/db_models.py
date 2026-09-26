from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.db.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    climate_zone = Column(String, nullable=True)
    location_name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    elevation = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String, default="draft")
    project_type = Column(String, default="new-build") # 'new-build' or 'retrofit'
    
    # Store scenario state as JSON string
    scenario_data = Column(String, nullable=True) 

class MaterialDB(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    thermal_conductivity = Column(Float)
    density = Column(Float)
    specific_heat = Column(Float)
    solar_absorptivity = Column(Float)
    emissivity = Column(Float)
    cost_per_m2 = Column(Float)
    weight_per_m2 = Column(Float)
    thickness = Column(Float)
