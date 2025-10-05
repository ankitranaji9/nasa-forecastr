# Weather Prediction FastAPI Backend

NASA Space Apps 2025 Challenge - "Will It Rain On My Parade?"

This FastAPI backend fetches historical NASA POWER data and calculates weather probabilities for any location and date.

## Features

- 📡 Integrates with NASA POWER API for historical climate data
- 🌍 Accepts latitude/longitude coordinates
- 📊 Calculates probabilities for:
  - Rain (>1mm precipitation)
  - Hot weather (>35°C)
  - Cold weather (<10°C)
  - High winds (>10 m/s)
- 🔄 Analyzes 15 years of historical data

## Local Development

### Prerequisites
- Python 3.9 or higher
- pip

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Test the API

Visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

Example request:
```bash
curl -X POST "http://localhost:8000/predict_weather" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 40.7128,
    "lon": -74.0060,
    "date": "2025-06-15T00:00:00Z",
    "variables": ["temperature", "rainfall", "windspeed"]
  }'
```

## Deployment Options

### Option 1: Render (Recommended - Free Tier)

1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `fastapi-backend`
5. Click "Create Web Service"
6. Copy your deployment URL (e.g., `https://your-app.onrender.com`)

### Option 2: Heroku

1. Install Heroku CLI
2. Create `Procfile` in `fastapi-backend/`:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```
3. Deploy:
```bash
heroku create your-app-name
git subtree push --prefix fastapi-backend heroku main
```

### Option 3: Railway

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Configure:
   - **Root Directory**: `fastapi-backend`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Deploy and copy your URL

## Update Frontend

After deployment, update your Lovable frontend to use the FastAPI URL:

In `src/pages/Index.tsx`, change:
```typescript
const response = await fetch(
  `YOUR_FASTAPI_URL/predict_weather`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: selectedLocation.lat,
      lon: selectedLocation.lon,
      date: date.toISOString(),
      variables,
    }),
  }
);
```

## API Endpoint

### POST /predict_weather

**Request Body:**
```json
{
  "lat": 40.7128,
  "lon": -74.0060,
  "date": "2025-06-15T00:00:00Z",
  "variables": ["temperature", "rainfall", "windspeed"]
}
```

**Response:**
```json
{
  "average_temp": 24.5,
  "rain_probability": 65,
  "hot_probability": 15,
  "cold_probability": 5,
  "wind_probability": 20,
  "data_years": 15
}
```

## Data Source

This API uses NASA POWER (Prediction Of Worldwide Energy Resources) which provides:
- 40+ years of historical climate data
- Global coverage at 0.5° x 0.5° resolution
- Validated against ground measurements

Learn more: https://power.larc.nasa.gov/

## License

NASA Space Apps Challenge 2025
