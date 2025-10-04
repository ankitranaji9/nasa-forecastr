import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarIcon, MapPin, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateLocationInputProps {
  onSearch: (location: string, date: Date, variables: string[]) => void;
  isLoading?: boolean;
}

const DateLocationInput = ({ onSearch, isLoading }: DateLocationInputProps) => {
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date>();
  const [selectedVariables, setSelectedVariables] = useState<string[]>(['temperature', 'rainfall']);

  const variables = [
    { id: 'temperature', label: 'Temperature' },
    { id: 'rainfall', label: 'Rainfall' },
    { id: 'windspeed', label: 'Wind Speed' },
  ];

  const handleSubmit = () => {
    if (location && date && selectedVariables.length > 0) {
      onSearch(location, date, selectedVariables);
    }
  };

  const toggleVariable = (variableId: string) => {
    setSelectedVariables((prev) =>
      prev.includes(variableId) ? prev.filter((v) => v !== variableId) : [...prev, variableId]
    );
  };

  return (
    <div className="glass-card p-6 space-y-6 rounded-xl">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Search Parameters
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="location" className="text-sm font-medium mb-2 block">
            Location
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="location"
              placeholder="Enter city name (e.g., New York, Tokyo)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-sm font-medium mb-3 block">Weather Variables</Label>
          <div className="space-y-3">
            {variables.map((variable) => (
              <div key={variable.id} className="flex items-center space-x-2">
                <Checkbox
                  id={variable.id}
                  checked={selectedVariables.includes(variable.id)}
                  onCheckedChange={() => toggleVariable(variable.id)}
                />
                <label
                  htmlFor={variable.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {variable.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!location || !date || selectedVariables.length === 0 || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Analyzing...' : 'Predict Weather'}
        </Button>
      </div>
    </div>
  );
};

export default DateLocationInput;
