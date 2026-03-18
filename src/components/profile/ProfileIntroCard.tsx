import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  Home as HomeIcon, 
  Heart, 
  Calendar,
  Users
} from "lucide-react";
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { shouldShowInfo } from '@/utils/privacyHelper';

interface ProfileIntroCardProps {
  profile: any;
  friendsCount: number;
  isOwnProfile: boolean;
  isFriend?: boolean;
  onEditClick?: () => void;
  onAddFeaturedClick?: () => void;
}

export const ProfileIntroCard = ({ profile, friendsCount, isOwnProfile, isFriend = false, onEditClick, onAddFeaturedClick }: ProfileIntroCardProps) => {
  const navigate = useNavigate();
  const privacy = profile?.privacy || {};

  // Helper to check if field should be shown
  const canShow = (field: string): boolean => {
    const privacyLevel = privacy[field] || 'public';
    return shouldShowInfo(privacyLevel, isOwnProfile, isFriend);
  };

  const hasInfo = (canShow('work') && profile?.work) ||
                  (canShow('education') && profile?.education) ||
                  (canShow('location') && profile?.current_city) ||
                  (canShow('location') && profile?.hometown) ||
                  (canShow('relationship') && profile?.relationship_status);

  return (
    <Card className="p-4 shadow-sm">
      <h3 className="font-semibold text-lg mb-3">Intro</h3>
      
      {profile?.bio && (
        <p className="text-sm text-center text-muted-foreground mb-4 pb-4 border-b border-border">
          {profile.bio}
        </p>
      )}

      <div className="space-y-2.5">
        {canShow('work') && profile?.work && (
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              Works at <span className="font-semibold">{profile.work}</span>
            </span>
          </div>
        )}

        {canShow('education') && profile?.education && (
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              Studied at <span className="font-semibold">{profile.education}</span>
            </span>
          </div>
        )}

        {canShow('location') && profile?.current_city && (
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              Lives in <span className="font-semibold">{profile.current_city}</span>
            </span>
          </div>
        )}

        {canShow('location') && profile?.hometown && (
          <div className="flex items-center gap-2.5">
            <HomeIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              From <span className="font-semibold">{profile.hometown}</span>
            </span>
          </div>
        )}

        {canShow('relationship') && profile?.relationship_status && (
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-semibold">{profile.relationship_status}</span>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm">
            <span className="font-semibold">{friendsCount}</span> friends
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm">
            Joined {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'recently'}
          </span>
        </div>
      </div>

    </Card>
  );
};
