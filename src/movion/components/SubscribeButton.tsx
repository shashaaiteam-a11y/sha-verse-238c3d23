import React from 'react';
import { Heart } from 'lucide-react';
import { useMovionSubscriptions } from '@/movion/hooks/useMovionSubscriptions';
import { useToast } from '@/hooks/use-toast';

interface SubscribeButtonProps {
  channelId: string;
  className?: string;
}

export function SubscribeButton({ channelId, className = '' }: SubscribeButtonProps) {
  const { isSubscribed, subscriberCount, isLoading, error, toggleSubscription } = 
    useMovionSubscriptions({ channelId });
  const { toast } = useToast();

  const handleClick = async () => {
    try {
      await toggleSubscription();
      
      const message = isSubscribed 
        ? 'Unsubscribed from this channel' 
        : 'Subscribed to this channel';
      
      toast({
        title: isSubscribed ? 'Unsubscribed' : 'Subscribed',
        description: message,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: error || 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Subscribe Button */}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          px-6 py-2 rounded-full font-semibold 
          transition-all duration-300
          flex items-center gap-2
          ${
            isSubscribed
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Heart
          className={`w-5 h-5 ${isSubscribed ? 'fill-current' : ''}`}
        />
        {isLoading ? 'Processing...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
      </button>

      {/* Subscriber Count */}
      <span className="text-sm text-gray-600">
        {subscriberCount} {subscriberCount === 1 ? 'subscriber' : 'subscribers'}
      </span>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

export default SubscribeButton;
