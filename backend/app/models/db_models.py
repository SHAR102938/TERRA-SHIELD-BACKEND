from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
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

class SimulationRunDB(Base):
    __tablename__ = "simulation_runs"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, nullable=True, index=True)
    scenario_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    inputs_json = Column(String, nullable=False)
    summary_json = Column(String, nullable=False)
    timeseries_json = Column(String, nullable=True)

