import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

interface SubscriptionCardProps {
  channel: {
    id: string;
    name: string;
    avatar_url?: string | null;
    subscribers_count?: number | null;
  };
}

const formatSubscribers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const SubscriptionCard = ({ channel }: SubscriptionCardProps) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/movion/channel/${channel.id}`)}
      className="flex flex-col items-center cursor-pointer group"
    >
      <Avatar className="h-16 w-16 ring-2 ring-transparent group-hover:ring-primary transition-all">
        <AvatarImage src={channel.avatar_url || undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
          {channel.name[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p className="text-xs font-medium mt-2 text-center line-clamp-1 max-w-[80px]">
        {channel.name}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatSubscribers(channel.subscribers_count || 0)}
      </p>
    </div>
  );
};
