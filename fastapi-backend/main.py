from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import requests
from datetime import datetime

app = FastAPI(title="Weather Prediction API")

# Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your Lovable domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WeatherRequest(BaseModel):
    lat: float
    lon: float
    date: str
    variables: List[str]

class WeatherResponse(BaseModel):
    average_temp: float
    rain_probability: int
    hot_probability: int
    cold_probability: int
    wind_probability: int
    data_years: int

@app.get("/")
async def root():
    return {
        "message": "Weather Prediction API - NASA Space Apps 2025",
        "endpoints": {
            "/predict_weather": "POST - Get weather predictions for a location and date"
        }
    }

@app.post("/predict_weather", response_model=WeatherResponse)
async def predict_weather(request: WeatherRequest):
    """
    Predict weather probabilities using NASA POWER API historical data.
    
    Args:
        lat: Latitude of the location
        lon: Longitude of the location
        date: Target date in ISO format
        variables: List of variables to analyze (temperature, rainfall, windspeed)
    
    Returns:
        Weather probabilities and average temperature
    """
    try:
        print(f"Predicting weather for: lat={request.lat}, lon={request.lon}, date={request.date}")
        
        # Parse the target date
        target_date = datetime.fromisoformat(request.date.replace('Z', '+00:00'))
        month = target_date.month
        day = target_date.day
        
        # Get historical data for the same date over the past 15 years
        current_year = datetime.now().year
        start_year = current_year - 15
        end_year = current_year - 1
        
        # Format dates for NASA POWER API (YYYYMMDD)
        start_date = f"{start_year}{month:02d}{day:02d}"
        end_date = f"{end_year}{month:02d}{day:02d}"
        
        # NASA POWER API parameters
        # T2M: Temperature at 2 Meters
        # PRECTOTCORR: Precipitation Corrected
        # WS10M: Wind Speed at 10 Meters
        parameters = 'T2M,PRECTOTCORR,WS10M'
        
        nasa_url = (
            f"https://power.larc.nasa.gov/api/temporal/daily/point"
            f"?parameters={parameters}"
            f"&community=AG"
            f"&longitude={request.lon}"
            f"&latitude={request.lat}"
            f"&start={start_date}"
            f"&end={end_date}"
            f"&format=JSON"
        )
        
        print(f"Fetching NASA data from: {nasa_url}")
        
        nasa_response = requests.get(nasa_url, timeout=30)
        
        if nasa_response.status_code != 200:
            raise HTTPException(
                status_code=nasa_response.status_code,
                detail=f"NASA API error: {nasa_response.status_code}"
            )
        
        nasa_data = nasa_response.json()
        print("NASA data received")
        
        # Extract daily data
        temps = nasa_data.get('properties', {}).get('parameter', {}).get('T2M', {})
        precip = nasa_data.get('properties', {}).get('parameter', {}).get('PRECTOTCORR', {})
        wind_speed = nasa_data.get('properties', {}).get('parameter', {}).get('WS10M', {})
        
        # Convert to lists for analysis, filtering out -999 (missing data)
        temp_values = [v for v in temps.values() if v != -999]
        precip_values = [v for v in precip.values() if v != -999]
        wind_values = [v for v in wind_speed.values() if v != -999]
        
        # Calculate average temperature
        average_temp = sum(temp_values) / len(temp_values) if temp_values else 20
        
        # Calculate rain probability (days with >1mm precipitation)
        rainy_days = sum(1 for p in precip_values if p > 1.0)
        rain_probability = round((rainy_days / len(precip_values)) * 100) if precip_values else 0
        
        # Calculate hot probability (temp > 35°C)
        hot_days = sum(1 for t in temp_values if t > 35)
        hot_probability = round((hot_days / len(temp_values)) * 100) if temp_values else 0
        
        # Calculate cold probability (temp < 10°C)
        cold_days = sum(1 for t in temp_values if t < 10)
        cold_probability = round((cold_days / len(temp_values)) * 100) if temp_values else 0
        
        # Calculate wind probability (wind speed > 10 m/s)
        windy_days = sum(1 for w in wind_values if w > 10)
        wind_probability = round((windy_days / len(wind_values)) * 100) if wind_values else 0
        
        result = {
            "average_temp": round(average_temp * 10) / 10,
            "rain_probability": rain_probability,
            "hot_probability": hot_probability,
            "cold_probability": cold_probability,
            "wind_probability": wind_probability,
            "data_years": len(temp_values),
        }
        
        print(f"Prediction result: {result}")
        
        return result
        
    except requests.RequestException as e:
        print(f"Error fetching NASA data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch NASA data: {str(e)}")
    except Exception as e:
        print(f"Error in predict_weather: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
