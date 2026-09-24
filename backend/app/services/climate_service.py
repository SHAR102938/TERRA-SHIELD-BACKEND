
import requests
from fastapi import HTTPException

def get_climate_data(latitude: float, longitude: float):
    """
    Fetches climate data from NASA POWER API.
    """
    base_url = "https://power.larc.nasa.gov/api/point"
    params = {
        "parameters": "T2M,ALLSKY_SFC_SW_DWN,RH2M,WS10M",
        "community": "RE",
        "longitude": longitude,
        "latitude": latitude,
        "format": "JSON",
        "header": "true" 
    }
    
    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Extracting the latest data point
        # This is a simplification. In a real application, you might want to average over a time period.
        properties = data.get("properties", {}).get("parameter", {})
        
        temp = properties.get("T2M", {}).get(next(iter(properties.get("T2M", {}))), None)
        solar_radiation = properties.get("ALLSKY_SFC_SW_DWN", {}).get(next(iter(properties.get("ALLSKY_SFC_SW_DWN", {}))), None)
        humidity = properties.get("RH2M", {}).get(next(iter(properties.get("RH2M", {}))), None)
        wind_speed = properties.get("WS10M", {}).get(next(iter(properties.get("WS10M", {}))), None)

        if any(v is None for v in [temp, solar_radiation, humidity, wind_speed]):
            raise HTTPException(status_code=404, detail="Climate data not available for this location.")

        return {
            "temperature": temp,
            "solar_radiation": solar_radiation,
            "relative_humidity": humidity,
            "wind_speed": wind_speed,
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Error fetching climate data from NASA POWER: {e}")
    except (KeyError, IndexError, StopIteration) as e:
        raise HTTPException(status_code=500, detail=f"Error parsing climate data: {e}")