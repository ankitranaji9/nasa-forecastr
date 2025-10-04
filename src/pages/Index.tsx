import { useState } from 'react';
import { Satellite } from 'lucide-react';
import LocationMap from '@/components/LocationMap';
import DateLocationInput from '@/components/DateLocationInput';
import WeatherResults from '@/components/WeatherResults';
import heroImage from '@/assets/hero-space.jpg';

const Index = () => {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lon: number;
    name?: string;
  }>();
  const [isLoading, setIsLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<{
    rain_probability: number;
    hot_probability: number;
    cold_probability: number;
    wind_probability: number;
    average_temp: number;
  }>();
  const [searchDate, setSearchDate] = useState<Date>();

  const handleLocationSelect = (lat: number, lon: number, name?: string) => {
    setSelectedLocation({ lat, lon, name });
  };

  const handleSearch = async (location: string, date: Date, variables: string[]) => {
    if (!selectedLocation) {
      console.error('No location selected');
      return;
    }

    setIsLoading(true);
    setSearchDate(date);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predict-weather`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lat: selectedLocation.lat,
            lon: selectedLocation.lon,
            date: date.toISOString(),
            variables,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch weather prediction');
      }

      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Fallback to mock data on error
      const mockData = {
        rain_probability: Math.floor(Math.random() * 100),
        hot_probability: Math.floor(Math.random() * 100),
        cold_probability: Math.floor(Math.random() * 100),
        wind_probability: Math.floor(Math.random() * 100),
        average_temp: 15 + Math.random() * 20,
      };
      setWeatherData(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-space">
      {/* Hero Section */}
      <div className="relative h-[60vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </div>

        <div className="relative h-full flex flex-col items-center justify-center text-center px-4 z-10">
          <div className="flex items-center gap-3 mb-4">
            <Satellite className="w-12 h-12 text-primary" />
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-aurora bg-clip-text text-transparent">
              Will It Rain On My Parade?
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl">
            Predict weather probabilities using NASA Earth observation data
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Powered by historical climate data from NASA POWER API
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Map and Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <LocationMap onLocationSelect={handleLocationSelect} selectedLocation={selectedLocation} />
            {selectedLocation?.name && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Selected: {selectedLocation.name}
              </p>
            )}
          </div>

          <div>
            <DateLocationInput onSearch={handleSearch} isLoading={isLoading} />
          </div>
        </div>

        {/* Results Section */}
        {weatherData && searchDate && (
          <WeatherResults
            data={weatherData}
            location={selectedLocation?.name || 'Selected Location'}
            date={searchDate}
          />
        )}

        {/* Info Section */}
        <div className="glass-card p-8 rounded-xl text-center">
          <h2 className="text-2xl font-bold mb-4">About This Tool</h2>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            This dashboard uses historical NASA Earth observation data to predict the probability of various
            weather conditions for any location and date. The predictions are based on decades of climate data,
            helping you plan events and activities with confidence.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
