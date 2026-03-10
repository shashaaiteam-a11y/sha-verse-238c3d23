import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeaturedPhotosProps {
  photos: any[];
  isOwnProfile: boolean;
  userId?: string;
  onSeeAllClick?: () => void;
}

export const FeaturedPhotos = ({ photos, isOwnProfile, userId, onSeeAllClick }: FeaturedPhotosProps) => {
  const navigate = useNavigate();
  const displayPhotos = photos?.slice(0, 9) || [];

  if (!isOwnProfile && displayPhotos.length === 0) {
    return null;
  }

  const handleSeeAllClick = () => {
    if (onSeeAllClick) {
      onSeeAllClick();
    }
  };

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Photos</h3>
        {displayPhotos.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary text-sm -mr-2"
            onClick={handleSeeAllClick}
          >
            See All Photos
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {displayPhotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
          {displayPhotos.map((photo: any, index: number) => (
            <div 
              key={photo.id} 
              className={`aspect-square cursor-pointer hover:opacity-90 transition-opacity ${
                index === 0 ? 'rounded-tl-lg' : ''
              } ${index === 2 ? 'rounded-tr-lg' : ''} ${
                index === 6 ? 'rounded-bl-lg' : ''
              } ${index === 8 ? 'rounded-br-lg' : ''}`}
            >
              <img 
                src={photo.image_url} 
                alt={photo.content || 'Photo'} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : isOwnProfile ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary"
            onClick={() => navigate('/')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Photos
          </Button>
        </div>
      ) : null}
    </Card>
  );
};
