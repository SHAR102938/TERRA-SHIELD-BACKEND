"""THERMASHELL Backend — Configuration via pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "THERMASHELL"
    API_VERSION: str = "v1"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./thermashell.db"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    # NASA POWER API
    NASA_POWER_BASE_URL: str = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    NASA_POWER_CACHE_TTL_HOURS: int = 168  # 7 days

    # Simulation
    MAX_SIMULATION_HOURS: int = 8760  # 1 year
    SIMULATION_TIMEOUT_S: int = 300

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
