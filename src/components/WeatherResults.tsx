import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CloudRain, Thermometer, Wind, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface WeatherResultsProps {
  data: {
    rain_probability: number;
    hot_probability: number;
    cold_probability: number;
    wind_probability: number;
    average_temp: number;
    temp_std_dev?: number;
    temp_confidence_range?: {
      lower: number;
      upper: number;
    };
    temp_trend?: string;
    temp_trend_value?: number;
    average_precip?: number;
    precip_std_dev?: number;
    data_points?: number;
    regional_coverage?: string;
  };
  location: string;
  date: Date;
}

const WeatherResults = ({ data, location, date }: WeatherResultsProps) => {
  const chartData = [
    { name: 'Rain', value: data.rain_probability, color: 'hsl(var(--aurora-blue))' },
    { name: 'Very Hot', value: data.hot_probability, color: 'hsl(var(--warning-orange))' },
    { name: 'Very Cold', value: data.cold_probability, color: 'hsl(var(--aurora-cyan))' },
    { name: 'Windy', value: data.wind_probability, color: 'hsl(var(--aurora-purple))' },
  ];

  const getTrendIcon = () => {
    if (!data.temp_trend) return <Minus className="w-4 h-4" />;
    if (data.temp_trend === 'warming') return <TrendingUp className="w-4 h-4 text-warning" />;
    if (data.temp_trend === 'cooling') return <TrendingDown className="w-4 h-4 text-aurora-cyan" />;
    return <Minus className="w-4 h-4" />;
  };

  const handleDownload = () => {
    const csvContent = `Location,Date,Rain Probability,Hot Probability,Cold Probability,Wind Probability,Average Temp,Temp Std Dev,Temp Lower CI,Temp Upper CI,Temp Trend,Average Precip,Regional Coverage
${location},${date.toLocaleDateString()},${data.rain_probability},${data.hot_probability},${data.cold_probability},${data.wind_probability},${data.average_temp},${data.temp_std_dev || 'N/A'},${data.temp_confidence_range?.lower || 'N/A'},${data.temp_confidence_range?.upper || 'N/A'},${data.temp_trend || 'N/A'},${data.average_precip || 'N/A'},${data.regional_coverage || 'N/A'}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weather-prediction-${date.toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Weather Prediction Results</h2>
          <p className="text-muted-foreground">
            {location} • {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Button onClick={handleDownload} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Download CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rain Probability</p>
              <p className="text-3xl font-bold text-aurora-blue mt-2">{data.rain_probability}%</p>
            </div>
            <CloudRain className="w-8 h-8 text-aurora-blue" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Very Hot</p>
              <p className="text-3xl font-bold text-warning mt-2">{data.hot_probability}%</p>
            </div>
            <Thermometer className="w-8 h-8 text-warning" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Very Cold</p>
              <p className="text-3xl font-bold text-aurora-cyan mt-2">{data.cold_probability}%</p>
            </div>
            <Thermometer className="w-8 h-8 text-aurora-cyan" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">High Winds</p>
              <p className="text-3xl font-bold text-aurora-purple mt-2">{data.wind_probability}%</p>
            </div>
            <Wind className="w-8 h-8 text-aurora-purple" />
          </div>
        </Card>
      </div>

      <Card className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-4">Probability Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {data.temp_std_dev !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Temperature Analysis</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average Temperature</span>
                <span className="font-semibold">{data.average_temp.toFixed(1)}°C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Standard Deviation</span>
                <span className="font-semibold">±{data.temp_std_dev.toFixed(1)}°C</span>
              </div>
              {data.temp_confidence_range && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">95% Confidence Range</span>
                  <span className="font-semibold">
                    {data.temp_confidence_range.lower.toFixed(1)}°C - {data.temp_confidence_range.upper.toFixed(1)}°C
                  </span>
                </div>
              )}
              {data.temp_trend && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Historical Trend</span>
                  <span className="font-semibold flex items-center gap-1 capitalize">
                    {getTrendIcon()}
                    {data.temp_trend}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Precipitation Analysis</h3>
            <div className="space-y-3">
              {data.average_precip !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Precipitation</span>
                  <span className="font-semibold">{data.average_precip.toFixed(2)} mm</span>
                </div>
              )}
              {data.precip_std_dev !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Standard Deviation</span>
                  <span className="font-semibold">±{data.precip_std_dev.toFixed(2)} mm</span>
                </div>
              )}
              {data.data_points && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Data Points Analyzed</span>
                  <span className="font-semibold">{data.data_points.toLocaleString()}</span>
                </div>
              )}
              {data.regional_coverage && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Regional Coverage</span>
                  <span className="font-semibold">{data.regional_coverage}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <Card className="glass-card p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
        <h3 className="text-lg font-semibold mb-2">Summary</h3>
        <p className="text-muted-foreground">
          Based on historical NASA Earth observation data{data.regional_coverage ? ` from a ${data.regional_coverage}` : ''}, there is a{' '}
          <span className="text-primary font-semibold">{data.rain_probability}% chance of rain</span> on this
          date at this location. The temperature is expected to be around{' '}
          <span className="text-primary font-semibold">{data.average_temp.toFixed(1)}°C</span>
          {data.temp_confidence_range && (
            <span>
              {' '}(95% confidence: {data.temp_confidence_range.lower.toFixed(1)}°C - {data.temp_confidence_range.upper.toFixed(1)}°C)
            </span>
          )}
          {data.temp_trend && data.temp_trend !== 'stable' && (
            <span>
              . Historical data shows a <span className="text-primary font-semibold">{data.temp_trend}</span> trend for this date.
            </span>
          )}
        </p>
      </Card>
    </div>
  );
};

export default WeatherResults;
