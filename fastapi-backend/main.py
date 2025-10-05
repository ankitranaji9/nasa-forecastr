from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import requests
from datetime import datetime
import statistics
import math
from concurrent.futures import ThreadPoolExecutor, as_completed

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
    temp_std_dev: float
    temp_confidence_range: Dict[str, float]
    temp_trend: str
    temp_trend_value: float
    average_precip: float
    precip_std_dev: float
    rain_probability: int
    hot_probability: int
    cold_probability: int
    wind_probability: int
    data_years: int
    data_points: int
    regional_coverage: str

@app.get("/")
async def root():
    return {
        "message": "Weather Prediction API - NASA Space Apps 2025",
        "endpoints": {
            "/predict_weather": "POST - Get weather predictions for a location and date"
        }
    }

def calculate_trend(values: List[float]) -> float:
    """Calculate linear regression slope for trend analysis."""
    if len(values) < 2:
        return 0.0
    
    n = len(values)
    indices = list(range(n))
    mean_x = sum(indices) / n
    mean_y = sum(values) / n
    
    numerator = sum((indices[i] - mean_x) * (values[i] - mean_y) for i in range(n))
    denominator = sum((indices[i] - mean_x) ** 2 for i in range(n))
    
    return numerator / denominator if denominator != 0 else 0.0


def fetch_location_data(lat: float, lon: float, start_date: str, end_date: str, parameters: str) -> dict:
    """Fetch NASA POWER data for a specific location."""
    nasa_url = (
        f"https://power.larc.nasa.gov/api/temporal/daily/point"
        f"?parameters={parameters}"
        f"&community=AG"
        f"&longitude={lon}"
        f"&latitude={lat}"
        f"&start={start_date}"
        f"&end={end_date}"
        f"&format=JSON"
    )
    
    response = requests.get(nasa_url, timeout=30)
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"NASA API error: {response.status_code}"
        )
    
    return response.json()


@app.post("/predict_weather", response_model=WeatherResponse)
async def predict_weather(request: WeatherRequest):
    """
    Predict weather probabilities using NASA POWER API historical data with regional analysis.
    
    Fetches data from 5 grid points (~50km radius) for robust regional predictions.
    Includes advanced statistics: standard deviation, confidence intervals, and trend analysis.
    
    Args:
        lat: Latitude of the location
        lon: Longitude of the location
        date: Target date in ISO format
        variables: List of variables to analyze (temperature, rainfall, windspeed)
    
    Returns:
        Regional weather probabilities with statistical analysis
    """
    try:
        print(f"Predicting weather for region around: lat={request.lat}, lon={request.lon}, date={request.date}")
        
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
        parameters = 'T2M,PRECTOTCORR,WS10M'
        
        # Define regional grid points (0.5° in each direction for ~50km radius)
        grid_points = [
            {"lat": request.lat, "lon": request.lon},  # Center
            {"lat": request.lat + 0.5, "lon": request.lon},  # North
            {"lat": request.lat - 0.5, "lon": request.lon},  # South
            {"lat": request.lat, "lon": request.lon + 0.5},  # East
            {"lat": request.lat, "lon": request.lon - 0.5},  # West
        ]
        
        print(f"Fetching regional NASA data from {len(grid_points)} grid points")
        
        # Fetch data for all grid points in parallel
        regional_data = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_point = {
                executor.submit(fetch_location_data, point["lat"], point["lon"], start_date, end_date, parameters): point
                for point in grid_points
            }
            
            for future in as_completed(future_to_point):
                try:
                    data = future.result()
                    regional_data.append(data)
                except Exception as e:
                    print(f"Error fetching data for point: {e}")
        
        print(f"Regional NASA data received from {len(regional_data)} points")
        
        # Aggregate data from all grid points
        all_temp_values = []
        all_precip_values = []
        all_wind_values = []
        
        for nasa_data in regional_data:
            temps = nasa_data.get('properties', {}).get('parameter', {}).get('T2M', {})
            precip = nasa_data.get('properties', {}).get('parameter', {}).get('PRECTOTCORR', {})
            wind_speed = nasa_data.get('properties', {}).get('parameter', {}).get('WS10M', {})
            
            all_temp_values.extend([v for v in temps.values() if v != -999])
            all_precip_values.extend([v for v in precip.values() if v != -999])
            all_wind_values.extend([v for v in wind_speed.values() if v != -999])
        
        # Calculate temperature statistics
        average_temp = statistics.mean(all_temp_values) if all_temp_values else 20
        temp_std_dev = statistics.stdev(all_temp_values) if len(all_temp_values) > 1 else 0
        temp_trend_value = calculate_trend(all_temp_values)
        
        # Determine trend interpretation
        if temp_trend_value > 0.01:
            temp_trend = "warming"
        elif temp_trend_value < -0.01:
            temp_trend = "cooling"
        else:
            temp_trend = "stable"
        
        # Calculate 95% confidence interval for temperature
        z_score = 1.96  # 95% confidence
        margin_of_error = z_score * (temp_std_dev / math.sqrt(len(all_temp_values))) if all_temp_values else 0
        temp_confidence_lower = average_temp - margin_of_error
        temp_confidence_upper = average_temp + margin_of_error
        
        # Calculate precipitation statistics
        average_precip = statistics.mean(all_precip_values) if all_precip_values else 0
        precip_std_dev = statistics.stdev(all_precip_values) if len(all_precip_values) > 1 else 0
        
        # Calculate probabilities
        rainy_days = sum(1 for p in all_precip_values if p > 1.0)
        rain_probability = round((rainy_days / len(all_precip_values)) * 100) if all_precip_values else 0
        
        hot_days = sum(1 for t in all_temp_values if t > 35)
        hot_probability = round((hot_days / len(all_temp_values)) * 100) if all_temp_values else 0
        
        cold_days = sum(1 for t in all_temp_values if t < 10)
        cold_probability = round((cold_days / len(all_temp_values)) * 100) if all_temp_values else 0
        
        windy_days = sum(1 for w in all_wind_values if w > 10)
        wind_probability = round((windy_days / len(all_wind_values)) * 100) if all_wind_values else 0
        
        result = {
            "average_temp": round(average_temp * 10) / 10,
            "temp_std_dev": round(temp_std_dev * 10) / 10,
            "temp_confidence_range": {
                "lower": round(temp_confidence_lower * 10) / 10,
                "upper": round(temp_confidence_upper * 10) / 10,
            },
            "temp_trend": temp_trend,
            "temp_trend_value": round(temp_trend_value * 1000) / 1000,
            "average_precip": round(average_precip * 100) / 100,
            "precip_std_dev": round(precip_std_dev * 100) / 100,
            "rain_probability": rain_probability,
            "hot_probability": hot_probability,
            "cold_probability": cold_probability,
            "wind_probability": wind_probability,
            "data_years": 15,
            "data_points": len(all_temp_values),
            "regional_coverage": f"~50km radius ({len(grid_points)} grid points)",
        }
        
        print(f"Regional prediction result: {result}")
        
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
