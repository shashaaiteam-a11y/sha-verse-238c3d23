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

// Comprehensive world locations with all countries
const popularLocations = [
  // India
  'Mumbai, India',
  'Delhi, India',
  'Bangalore, India',
  'Kolkata, India',
  'Chennai, India',
  'Hyderabad, India',
  'Pune, India',
  'Ahmedabad, India',
  'Jaipur, India',
  'Lucknow, India',
  // USA
  'New York, USA',
  'Los Angeles, USA',
  'Chicago, USA',
  'Houston, USA',
  'Phoenix, USA',
  'San Francisco, USA',
  'Seattle, USA',
  'Miami, USA',
  'Boston, USA',
  'Denver, USA',
  // UK
  'London, UK',
  'Manchester, UK',
  'Birmingham, UK',
  'Edinburgh, UK',
  'Glasgow, UK',
  // Canada
  'Toronto, Canada',
  'Vancouver, Canada',
  'Montreal, Canada',
  'Calgary, Canada',
  'Ottawa, Canada',
  // Australia
  'Sydney, Australia',
  'Melbourne, Australia',
  'Brisbane, Australia',
  'Perth, Australia',
  'Adelaide, Australia',
  // Japan
  'Tokyo, Japan',
  'Osaka, Japan',
  'Kyoto, Japan',
  'Yokohama, Japan',
  'Sapporo, Japan',
  // China
  'Beijing, China',
  'Shanghai, China',
  'Guangzhou, China',
  'Shenzhen, China',
  'Chongqing, China',
  // Germany
  'Berlin, Germany',
  'Munich, Germany',
  'Hamburg, Germany',
  'Cologne, Germany',
  'Frankfurt, Germany',
  // France
  'Paris, France',
  'Marseille, France',
  'Lyon, France',
  'Toulouse, France',
  'Nice, France',
  // Italy
  'Rome, Italy',
  'Milan, Italy',
  'Naples, Italy',
  'Florence, Italy',
  'Venice, Italy',
  // Spain
  'Madrid, Spain',
  'Barcelona, Spain',
  'Valencia, Spain',
  'Seville, Spain',
  'Bilbao, Spain',
  // Netherlands
  'Amsterdam, Netherlands',
  'Rotterdam, Netherlands',
  'The Hague, Netherlands',
  'Utrecht, Netherlands',
  // Brazil
  'São Paulo, Brazil',
  'Rio de Janeiro, Brazil',
  'Brasília, Brazil',
  'Salvador, Brazil',
  'Fortaleza, Brazil',
  // Mexico
  'Mexico City, Mexico',
  'Guadalajara, Mexico',
  'Cancún, Mexico',
  'Monterrey, Mexico',
  'Playa del Carmen, Mexico',
  // Argentina
  'Buenos Aires, Argentina',
  'Córdoba, Argentina',
  'Rosario, Argentina',
  'Mendoza, Argentina',
  // South Korea
  'Seoul, South Korea',
  'Busan, South Korea',
  'Incheon, South Korea',
  'Daegu, South Korea',
  'Daejeon, South Korea',
  // Singapore
  'Singapore, Singapore',
  // Thailand
  'Bangkok, Thailand',
  'Phuket, Thailand',
  'Chiang Mai, Thailand',
  'Pattaya, Thailand',
  // Vietnam
  'Hanoi, Vietnam',
  'Ho Chi Minh City, Vietnam',
  'Da Nang, Vietnam',
  // Philippines
  'Manila, Philippines',
  'Cebu, Philippines',
  'Davao, Philippines',
  // Indonesia
  'Jakarta, Indonesia',
  'Surabaya, Indonesia',
  'Bandung, Indonesia',
  'Medan, Indonesia',
  // Malaysia
  'Kuala Lumpur, Malaysia',
  'George Town, Malaysia',
  'Johor Bahru, Malaysia',
  // UAE
  'Dubai, UAE',
  'Abu Dhabi, UAE',
  'Sharjah, UAE',
  // Saudi Arabia
  'Riyadh, Saudi Arabia',
  'Jeddah, Saudi Arabia',
  'Dammam, Saudi Arabia',
  // Egypt
  'Cairo, Egypt',
  'Alexandria, Egypt',
  'Giza, Egypt',
  // South Africa
  'Johannesburg, South Africa',
  'Cape Town, South Africa',
  'Durban, South Africa',
  'Pretoria, South Africa',
  // Turkey
  'Istanbul, Turkey',
  'Ankara, Turkey',
  'Izmir, Turkey',
  'Antalya, Turkey',
  // Greece
  'Athens, Greece',
  'Thessaloniki, Greece',
  'Mykonos, Greece',
  // Poland
  'Warsaw, Poland',
  'Krakow, Poland',
  'Gdansk, Poland',
  // Sweden
  'Stockholm, Sweden',
  'Gothenburg, Sweden',
  'Malmö, Sweden',
  // Norway
  'Oslo, Norway',
  'Bergen, Norway',
  'Stavanger, Norway',
  // Denmark
  'Copenhagen, Denmark',
  'Aarhus, Denmark',
  // Belgium
  'Brussels, Belgium',
  'Antwerp, Belgium',
  'Ghent, Belgium',
  // Austria
  'Vienna, Austria',
  'Salzburg, Austria',
  'Innsbruck, Austria',
  // Switzerland
  'Zurich, Switzerland',
  'Geneva, Switzerland',
  'Bern, Switzerland',
  'Lucerne, Switzerland',
  // Portugal
  'Lisbon, Portugal',
  'Porto, Portugal',
  'Algarve, Portugal',
  // Czech Republic
  'Prague, Czech Republic',
  'Brno, Czech Republic',
  // Hungary
  'Budapest, Hungary',
  // Romania
  'Bucharest, Romania',
  'Cluj-Napoca, Romania',
  // Croatia
  'Zagreb, Croatia',
  'Dubrovnik, Croatia',
  'Split, Croatia',
  // Serbia
  'Belgrade, Serbia',
  // Russia
  'Moscow, Russia',
  'Saint Petersburg, Russia',
  // Ukraine
  'Kyiv, Ukraine',
  'Kharkiv, Ukraine',
  // Pakistan
  'Karachi, Pakistan',
  'Lahore, Pakistan',
  'Islamabad, Pakistan',
  'Rawalpindi, Pakistan',
  // Bangladesh
  'Dhaka, Bangladesh',
  'Chittagong, Bangladesh',
  // Sri Lanka
  'Colombo, Sri Lanka',
  'Kandy, Sri Lanka',
  // Nepal
  'Kathmandu, Nepal',
  'Pokhara, Nepal',
  // New Zealand
  'Auckland, New Zealand',
  'Wellington, New Zealand',
  'Christchurch, New Zealand',
  // Israel
  'Tel Aviv, Israel',
  'Jerusalem, Israel',
  // Iran
  'Tehran, Iran',
  'Isfahan, Iran',
  // Iraq
  'Baghdad, Iraq',
  // Lebanon
  'Beirut, Lebanon',
  // Jordan
  'Amman, Jordan',
  // Kuwait
  'Kuwait City, Kuwait',
  // Qatar
  'Doha, Qatar',
  // Bahrain
  'Manama, Bahrain',
  // Oman
  'Muscat, Oman',
  // Yemen
  'Sanaa, Yemen',
  // Kenya
  'Nairobi, Kenya',
  // Nigeria
  'Lagos, Nigeria',
  'Abuja, Nigeria',
  // Ghana
  'Accra, Ghana',
  // Ethiopia
  'Addis Ababa, Ethiopia',
  // Morocco
  'Casablanca, Morocco',
  'Marrakech, Morocco',
  'Fez, Morocco',
  // Algeria
  'Algiers, Algeria',
  // Tunisia
  'Tunis, Tunisia',
  // Colombia
  'Bogotá, Colombia',
  'Medellín, Colombia',
  'Cartagena, Colombia',
  // Peru
  'Lima, Peru',
  'Cusco, Peru',
  // Chile
  'Santiago, Chile',
  'Valparaíso, Chile',
  // Ecuador
  'Quito, Ecuador',
  // Venezuela
  'Caracas, Venezuela',
  // Bolivia
  'La Paz, Bolivia',
  // Paraguay
  'Asunción, Paraguay',
  // Uruguay
  'Montevideo, Uruguay',
  // Costa Rica
  'San José, Costa Rica',
  // Panama
  'Panama City, Panama',
  // Guatemala
  'Guatemala City, Guatemala',
  // Honduras
  'Tegucigalpa, Honduras',
  // Nicaragua
  'Managua, Nicaragua',
  // El Salvador
  'San Salvador, El Salvador',
  // Dominican Republic
  'Santo Domingo, Dominican Republic',
  'Punta Cana, Dominican Republic',
  // Cuba
  'Havana, Cuba',
  // Jamaica
  'Kingston, Jamaica',
  'Montego Bay, Jamaica',
  // Trinidad and Tobago
  'Port of Spain, Trinidad and Tobago',
  // Bahamas
  'Nassau, Bahamas',
  // Iceland
  'Reykjavik, Iceland',
  // Ireland
  'Dublin, Ireland',
  'Cork, Ireland',
  // Wales
  'Cardiff, Wales',
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
        <DialogContent className="w-[min(92vw,32rem)] max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-4 sm:px-5">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Add Location <span className="text-sm font-normal text-muted-foreground">(Where to Share)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
            {/* Detect Current Location */}
            <Button 
              onClick={detectLocation} 
              disabled={isDetecting}
              variant="outline"
              className="h-11 w-full gap-2"
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
                className="h-11 pl-10"
              />
            </div>

            {/* Custom Location */}
            {search && !filteredLocations.includes(search) && (
              <Button 
                variant="ghost" 
                className="h-11 w-full justify-start gap-2 rounded-lg border border-dashed border-border"
                onClick={() => selectLocation(search)}
              >
                <MapPin className="w-4 h-4" />
                Use "{search}"
              </Button>
            )}

            {/* All Locations */}
            <div className="rounded-lg border border-border bg-secondary/30 p-2">
              <p className="mb-2 px-2 text-xs text-muted-foreground">All Locations</p>
              <div className="max-h-[240px] space-y-1 overflow-y-auto pr-1">
              {filteredLocations.map((location) => (
                <Button
                  key={location}
                  variant="ghost"
                  className="h-11 w-full justify-start gap-2 rounded-lg text-sm"
                  onClick={() => selectLocation(location)}
                >
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {location}
                </Button>
              ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
