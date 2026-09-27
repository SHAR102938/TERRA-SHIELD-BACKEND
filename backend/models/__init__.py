"""SQLAlchemy model for climate data cache."""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from database import Base


class ClimateSnapshot(Base):
    __tablename__ = "climate_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    start_date = Column(String(8), nullable=False)  # YYYYMMDD
    end_date = Column(String(8), nullable=False)
    params_hash = Column(String(64), nullable=False, index=True)
    data_json = Column(Text, nullable=False)
    source = Column(String(50), default="nasa_power")
    is_fallback = Column(Integer, default=0)  # SQLite boolean
    fetched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SimulationRecord(Base):
    __tablename__ = "simulation_records"

    id = Column(String, primary_key=True)
    scenario_id = Column(String, nullable=True, index=True)
    project_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    inputs_json = Column(Text, nullable=False)
    summary_json = Column(Text, nullable=False)
    timeseries_json = Column(Text, nullable=True)

