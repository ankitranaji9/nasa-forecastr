import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate standard deviation
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

// Helper function to calculate trend (linear regression slope)
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  const meanX = indices.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (indices[i] - meanX) * (values[i] - meanY);
    denominator += Math.pow(indices[i] - meanX, 2);
  }
  
  return denominator !== 0 ? numerator / denominator : 0;
}

// Helper function to fetch data for a location
async function fetchLocationData(lat: number, lon: number, startDate: string, endDate: string, parameters: string) {
  const nasaUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${parameters}&community=AG&longitude=${lon}&latitude=${lat}&start=${startDate}&end=${endDate}&format=JSON`;
  const response = await fetch(nasaUrl);
  
  if (!response.ok) {
    throw new Error(`NASA API error: ${response.status}`);
  }
  
  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, date, variables } = await req.json();
    console.log('Predicting weather for region around:', { lat, lon, date, variables });

    // Parse the target date
    const targetDate = new Date(date);
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    
    // Get historical data for the same date over the past 15 years
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 15;
    const endYear = currentYear - 1;
    
    // Format dates for NASA POWER API (YYYYMMDD)
    const startDate = `${startYear}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    const endDate = `${endYear}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    
    // NASA POWER API parameters
    const parameters = 'T2M,PRECTOTCORR,WS10M';
    
    // Define regional grid points (0.5° in each direction for ~50km radius)
    const gridPoints = [
      { lat, lon }, // Center point
      { lat: lat + 0.5, lon }, // North
      { lat: lat - 0.5, lon }, // South
      { lat, lon: lon + 0.5 }, // East
      { lat, lon: lon - 0.5 }, // West
    ];
    
    console.log('Fetching regional NASA data from 5 grid points');
    
    // Fetch data for all grid points in parallel
    const regionalData = await Promise.all(
      gridPoints.map(point => fetchLocationData(point.lat, point.lon, startDate, endDate, parameters))
    );
    
    console.log('Regional NASA data received');
    
    // Aggregate data from all grid points
    let allTempValues: number[] = [];
    let allPrecipValues: number[] = [];
    let allWindValues: number[] = [];
    
    for (const nasaData of regionalData) {
      const temps = nasaData.properties?.parameter?.T2M || {};
      const precip = nasaData.properties?.parameter?.PRECTOTCORR || {};
      const windSpeed = nasaData.properties?.parameter?.WS10M || {};
      
      allTempValues.push(...Object.values(temps).filter((v: any) => v !== -999) as number[]);
      allPrecipValues.push(...Object.values(precip).filter((v: any) => v !== -999) as number[]);
      allWindValues.push(...Object.values(windSpeed).filter((v: any) => v !== -999) as number[]);
    }
    
    // Calculate statistics
    const average_temp = allTempValues.length > 0 
      ? allTempValues.reduce((a, b) => a + b, 0) / allTempValues.length 
      : 20;
    
    const temp_std_dev = calculateStdDev(allTempValues, average_temp);
    const temp_trend = calculateTrend(allTempValues);
    
    // Calculate 95% confidence interval for temperature
    const z_score = 1.96; // 95% confidence
    const margin_of_error = z_score * (temp_std_dev / Math.sqrt(allTempValues.length));
    const temp_confidence_lower = average_temp - margin_of_error;
    const temp_confidence_upper = average_temp + margin_of_error;
    
    // Calculate average precipitation
    const average_precip = allPrecipValues.length > 0
      ? allPrecipValues.reduce((a, b) => a + b, 0) / allPrecipValues.length
      : 0;
    const precip_std_dev = calculateStdDev(allPrecipValues, average_precip);
    
    // Calculate probabilities
    const rainyDays = allPrecipValues.filter(p => p > 1.0).length;
    const rain_probability = allPrecipValues.length > 0 
      ? Math.round((rainyDays / allPrecipValues.length) * 100) 
      : 0;
    
    const hotDays = allTempValues.filter(t => t > 35).length;
    const hot_probability = allTempValues.length > 0 
      ? Math.round((hotDays / allTempValues.length) * 100) 
      : 0;
    
    const coldDays = allTempValues.filter(t => t < 10).length;
    const cold_probability = allTempValues.length > 0 
      ? Math.round((coldDays / allTempValues.length) * 100) 
      : 0;
    
    const windyDays = allWindValues.filter(w => w > 10).length;
    const wind_probability = allWindValues.length > 0 
      ? Math.round((windyDays / allWindValues.length) * 100) 
      : 0;
    
    const result = {
      average_temp: Math.round(average_temp * 10) / 10,
      temp_std_dev: Math.round(temp_std_dev * 10) / 10,
      temp_confidence_range: {
        lower: Math.round(temp_confidence_lower * 10) / 10,
        upper: Math.round(temp_confidence_upper * 10) / 10,
      },
      temp_trend: temp_trend > 0.01 ? 'warming' : temp_trend < -0.01 ? 'cooling' : 'stable',
      temp_trend_value: Math.round(temp_trend * 1000) / 1000,
      average_precip: Math.round(average_precip * 100) / 100,
      precip_std_dev: Math.round(precip_std_dev * 100) / 100,
      rain_probability,
      hot_probability,
      cold_probability,
      wind_probability,
      data_years: 15,
      data_points: allTempValues.length,
      regional_coverage: `~50km radius (${gridPoints.length} grid points)`,
    };
    
    console.log('Regional prediction result:', result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in predict-weather function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
