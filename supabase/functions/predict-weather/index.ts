import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, date, variables } = await req.json();
    console.log('Predicting weather for:', { lat, lon, date, variables });

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
    // T2M: Temperature at 2 Meters
    // PRECTOTCORR: Precipitation Corrected
    // WS10M: Wind Speed at 10 Meters
    const parameters = 'T2M,PRECTOTCORR,WS10M';
    
    const nasaUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${parameters}&community=AG&longitude=${lon}&latitude=${lat}&start=${startDate}&end=${endDate}&format=JSON`;
    
    console.log('Fetching NASA data from:', nasaUrl);
    
    const nasaResponse = await fetch(nasaUrl);
    
    if (!nasaResponse.ok) {
      throw new Error(`NASA API error: ${nasaResponse.status}`);
    }
    
    const nasaData = await nasaResponse.json();
    console.log('NASA data received');
    
    // Extract daily data
    const temps = nasaData.properties.parameter.T2M || {};
    const precip = nasaData.properties.parameter.PRECTOTCORR || {};
    const windSpeed = nasaData.properties.parameter.WS10M || {};
    
    // Convert to arrays for analysis
    const tempValues = Object.values(temps).filter((v: any) => v !== -999) as number[];
    const precipValues = Object.values(precip).filter((v: any) => v !== -999) as number[];
    const windValues = Object.values(windSpeed).filter((v: any) => v !== -999) as number[];
    
    // Calculate average temperature
    const average_temp = tempValues.length > 0 
      ? tempValues.reduce((a: number, b: number) => a + b, 0) / tempValues.length 
      : 20;
    
    // Calculate rain probability (days with >1mm precipitation)
    const rainyDays = precipValues.filter((p: number) => p > 1.0).length;
    const rain_probability = precipValues.length > 0 
      ? Math.round((rainyDays / precipValues.length) * 100) 
      : 0;
    
    // Calculate hot probability (temp > 35°C)
    const hotDays = tempValues.filter((t: number) => t > 35).length;
    const hot_probability = tempValues.length > 0 
      ? Math.round((hotDays / tempValues.length) * 100) 
      : 0;
    
    // Calculate cold probability (temp < 10°C)
    const coldDays = tempValues.filter((t: number) => t < 10).length;
    const cold_probability = tempValues.length > 0 
      ? Math.round((coldDays / tempValues.length) * 100) 
      : 0;
    
    // Calculate wind probability (wind speed > 10 m/s)
    const windyDays = windValues.filter((w: number) => w > 10).length;
    const wind_probability = windValues.length > 0 
      ? Math.round((windyDays / windValues.length) * 100) 
      : 0;
    
    const result = {
      average_temp: Math.round(average_temp * 10) / 10,
      rain_probability,
      hot_probability,
      cold_probability,
      wind_probability,
      data_years: tempValues.length,
    };
    
    console.log('Prediction result:', result);
    
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
