"""
NASA POWER Climate Data Service.

- Proxies https://power.larc.nasa.gov/api/temporal/hourly/point
- Caches responses in SQLite (keyed by lat/lon/date-range hash)
- Falls back to labeled demo snapshot on failure
- Rate-limits outbound calls
"""

from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models import ClimateSnapshot
from exceptions import ClimateSourceUnavailable


# Simple in-memory rate limiter
_last_call_time: float = 0.0
_MIN_INTERVAL_S: float = 2.0  # At least 2s between NASA API calls


# ── Demo/Fallback Data ──────────────────────────────────────────────────

LEH_WINTER_DEMO = {
    "source": "DEMO/FALLBACK — LEH-WINTER-72H",
    "latitude": 34.15,
    "longitude": 77.58,
    "parameters": {
        "T2M": {}, "RH2M": {}, "WS10M": {}, "ALLSKY_SFC_SW_DWN": {}
    },
    "properties": {
        "parameter": {
            "T2M": {"longname": "Temperature at 2 Meters", "units": "C"},
            "RH2M": {"longname": "Relative Humidity at 2 Meters", "units": "%"},
            "WS10M": {"longname": "Wind Speed at 10 Meters", "units": "m/s"},
            "ALLSKY_SFC_SW_DWN": {"longname": "All Sky Surface Shortwave Downward Irradiance", "units": "W/m^2"},
        }
    },
    "is_demo": True,
}

# Generate 72h of synthetic Leh winter data
import math
_leh_hours = 72
for param, gen_fn in [
    ("T2M", lambda h: round(-10 + 5 * math.sin(2 * math.pi * h / 24 - math.pi/2), 2)),
    ("RH2M", lambda h: round(25 + 5 * math.sin(2 * math.pi * h / 24), 1)),
    ("WS10M", lambda h: round(2 + 1.5 * abs(math.sin(2 * math.pi * h / 24)), 1)),
    ("ALLSKY_SFC_SW_DWN", lambda h: max(0, round(400 * math.sin(math.pi * (h % 24 - 6) / 12), 1)) if 6 <= h % 24 <= 18 else 0.0),
]:
    LEH_WINTER_DEMO["parameters"][param] = {
        f"2024011500": None  # placeholder header
    }
    for h in range(_leh_hours):
        key = f"202401{15 + h // 24:02d}{h % 24:02d}"
        LEH_WINTER_DEMO["parameters"][param][key] = gen_fn(h)


def _make_cache_key(lat: float, lon: float, start: str, end: str, params: str) -> str:
    raw = f"{lat:.4f}|{lon:.4f}|{start}|{end}|{params}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def fetch_climate_data(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
    parameters: str = "T2M,RH2M,WS10M,ALLSKY_SFC_SW_DWN",
    community: str = "SB",
) -> dict:
    """
    Fetch hourly climate data from NASA POWER, with caching and fallback.

    Args:
        db: Database session
        latitude: Degrees N (-90 to 90)
        longitude: Degrees E (-180 to 180)
        start_date: YYYYMMDD
        end_date: YYYYMMDD
        parameters: Comma-separated NASA POWER parameter codes
        community: NASA POWER community (SB=Sustainable Buildings)

    Returns:
        Dict with climate data, source info, and fallback flag
    """
    global _last_call_time

    cache_key = _make_cache_key(latitude, longitude, start_date, end_date, parameters)

    # ── 1. Check cache ──────────────────────────────────────────────────
    stmt = select(ClimateSnapshot).where(ClimateSnapshot.params_hash == cache_key)
    result = await db.execute(stmt)
    cached = result.scalar_one_or_none()

    if cached:
        data = json.loads(cached.data_json)
        data["_cache"] = {
            "hit": True,
            "fetched_at": cached.fetched_at.isoformat() if cached.fetched_at else None,
            "is_fallback": bool(cached.is_fallback),
        }
        return data

    # ── 2. Rate limiting ────────────────────────────────────────────────
    now = time.time()
    elapsed = now - _last_call_time
    if elapsed < _MIN_INTERVAL_S:
        import asyncio
        await asyncio.sleep(_MIN_INTERVAL_S - elapsed)

    # ── 3. Call NASA POWER API ──────────────────────────────────────────
    url = settings.NASA_POWER_BASE_URL
    params_dict = {
        "latitude": latitude,
        "longitude": longitude,
        "start": start_date,
        "end": end_date,
        "parameters": parameters,
        "community": community,
        "format": "json",
        "time-standard": "UTC",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params_dict)
            _last_call_time = time.time()

        if response.status_code != 200:
            raise ClimateSourceUnavailable(
                f"NASA POWER returned status {response.status_code}: {response.text[:200]}",
            )

        data = response.json()

        # Normalize — NASA POWER wraps data under "properties" and "parameters"
        normalized = {
            "source": "NASA POWER (live)",
            "latitude": latitude,
            "longitude": longitude,
            "parameters": data.get("properties", {}).get("parameter", {}),
            "is_demo": False,
            "_cache": {"hit": False, "is_fallback": False},
        }

        # Also include raw parameter timeseries
        if "properties" in data and "parameter" in data["properties"]:
            normalized["parameters"] = data["properties"]["parameter"]

        # ── 4. Cache the result ─────────────────────────────────────────
        snapshot = ClimateSnapshot(
            latitude=latitude,
            longitude=longitude,
            start_date=start_date,
            end_date=end_date,
            params_hash=cache_key,
            data_json=json.dumps(normalized),
            source="nasa_power",
            is_fallback=0,
        )
        db.add(snapshot)
        await db.commit()

        return normalized

    except (httpx.HTTPError, httpx.TimeoutException, Exception) as e:
        # ── 5. Fallback to demo data ────────────────────────────────────
        fallback = {
            **LEH_WINTER_DEMO,
            "source": "DEMO/FALLBACK — LEH-WINTER-72H (NASA POWER unavailable)",
            "_cache": {"hit": False, "is_fallback": True},
            "_error": str(e)[:200],
        }

        # Cache the fallback too so we don't hammer the API
        snapshot = ClimateSnapshot(
            latitude=latitude,
            longitude=longitude,
            start_date=start_date,
            end_date=end_date,
            params_hash=cache_key,
            data_json=json.dumps(fallback),
            source="demo_fallback",
            is_fallback=1,
        )
        db.add(snapshot)
        await db.commit()

        return fallback
