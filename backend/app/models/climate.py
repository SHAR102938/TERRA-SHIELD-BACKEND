
from pydantic import BaseModel

class Location(BaseModel):
    latitude: float
    longitude: float

class ClimateData(BaseModel):
    temperature: float
    solar_radiation: float
    relative_humidity: float
    wind_speed: float

class ClimateResponse(BaseModel):
    location: Location
    climate: ClimateData
    source: str = "NASA POWER"