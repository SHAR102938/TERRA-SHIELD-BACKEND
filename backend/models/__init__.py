"""SQLAlchemy model for climate data cache."""

from datetime import datetime
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
    fetched_at = Column(DateTime, default=datetime.utcnow)
