// Movion Channel Badge Component
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChannelBadgeProps {
  id: string;
  name: string;
  avatar: string;
  subscribers?: number;
  size?: 'sm' | 'md' | 'lg';
  showSubscribers?: boolean;
  basePath?: string;
  className?: string;
}

export const ChannelBadge: React.FC<ChannelBadgeProps> = ({
  id,
  name,
  avatar,
  subscribers = 0,
  size = 'md',
  showSubscribers = false,
  basePath = '/movion',
  className
}) => {
  const sizeStyles = {
    sm: { avatar: 'w-8 h-8', name: 'text-sm', subs: 'text-xs' },
    md: { avatar: 'w-10 h-10', name: 'text-sm', subs: 'text-xs' },
    lg: { avatar: 'w-12 h-12', name: 'text-base', subs: 'text-sm' }
  };

  return (
    <Link 
      to={`${basePath}/channel/${id}`}
      className={cn("flex items-center gap-3 group", className)}
    >
      <img 
        src={avatar} 
        alt={name}
        className={cn(
          "rounded-full object-cover border border-gray-100 transition-transform group-hover:scale-105",
          sizeStyles[size].avatar
        )}
      />
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1">
          <span className={cn(
            "font-bold text-[#030303] truncate group-hover:text-blue-600 transition-colors",
            sizeStyles[size].name
          )}>
            {name}
          </span>
          <CheckCircle2 size={14} className="text-[#606060] shrink-0" />
        </div>
        {showSubscribers && (
          <span className={cn("text-[#606060]", sizeStyles[size].subs)}>
            {Intl.NumberFormat('en', { notation: 'compact' }).format(subscribers)} subscribers
          </span>
        )}
      </div>
    </Link>
  );
};

export default ChannelBadge;
