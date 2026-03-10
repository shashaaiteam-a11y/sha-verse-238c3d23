import { useState, useEffect } from 'react';
import { MapPin, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface LocationPickerProps {
  value?: string;
  onChange: (location: string | null) => void;
}

// Predefined popular locations for quick selection
const popularLocations = [
  'Mumbai, India',
  'Delhi, India',
  'Bangalore, India',
  'Kolkata, India',
  'Chennai, India',
  'Hyderabad, India',
  'Pune, India',
  'Ahmedabad, India',
  'Jaipur, India',
  'New York, USA',
  'London, UK',
  'Dubai, UAE',
];

export const LocationPicker = ({ value, onChange }: LocationPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const { toast } = useToast();

  const filteredLocations = popularLocations.filter(loc =>
    loc.toLowerCase().includes(search.toLowerCase())
  );

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support location detection',
        variant: 'destructive'
      });
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get location name
          const { latitude, longitude } = position.coords;
          
          // Simple reverse geocoding using Nominatim (free)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          const country = data.address?.country || '';
          const locationName = [city, country].filter(Boolean).join(', ');
          
          if (locationName) {
            onChange(locationName);
            toast({ title: 'Location detected', description: locationName });
          } else {
            onChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
          setOpen(false);
        } catch (error) {
          toast({
            title: 'Error detecting location',
            description: 'Could not determine your location name',
            variant: 'destructive'
          });
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        setIsDetecting(false);
        toast({
          title: 'Location access denied',
          description: 'Please allow location access to use this feature',
          variant: 'destructive'
        });
      }
    );
  };

  const selectLocation = (location: string) => {
    onChange(location);
    setOpen(false);
    setSearch('');
  };

  const clearLocation = () => {
    onChange(null);
  };

  return (
    <>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-sm">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary font-medium truncate max-w-[150px]">{value}</span>
          <button 
            onClick={clearLocation}
            className="p-0.5 hover:bg-primary/20 rounded-full"
          >
            <X className="w-3 h-3 text-primary" />
          </button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <MapPin className="w-5 h-5" />
          <span className="hidden sm:inline">Location</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Add Location
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Detect Current Location */}
            <Button 
              onClick={detectLocation} 
              disabled={isDetecting}
              variant="outline"
              className="w-full gap-2"
            >
              {isDetecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              {isDetecting ? 'Detecting...' : 'Use Current Location'}
            </Button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search location..."
                className="pl-10"
              />
            </div>

            {/* Custom Location */}
            {search && !filteredLocations.includes(search) && (
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2"
                onClick={() => selectLocation(search)}
              >
                <MapPin className="w-4 h-4" />
                Use "{search}"
              </Button>
            )}

            {/* Popular Locations */}
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              <p className="text-xs text-muted-foreground px-2 mb-2">Popular Locations</p>
              {filteredLocations.map((location) => (
                <Button
                  key={location}
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() => selectLocation(location)}
                >
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {location}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
