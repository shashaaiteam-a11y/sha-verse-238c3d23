// Movion Subscribe Button - YouTube-like Implementation with Supabase
import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellRing, ChevronDown, Check, UserMinus, BellOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type NotificationLevel = 'ALL' | 'PERSONALIZED' | 'NONE';

// Subscribe Button State Machine
type SubscribeState = 'SHOW_SUBSCRIBE' | 'SHOW_SUBSCRIBED' | 'DISABLED' | 'LOGIN_REQUIRED';

interface SubscribeButtonProps {
  channelId: string;
  channelOwnerId?: string; // If provided, hide button when viewer is owner
  variant?: 'default' | 'minimal';
  size?: 'sm' | 'md';
  className?: string;
  dropdownAlign?: 'left' | 'right';
  dropdownPosition?: 'top' | 'bottom';
}

export const SubscribeButton: React.FC<SubscribeButtonProps> = ({ 
  channelId, 
  channelOwnerId,
  variant = 'default', 
  size = 'md', 
  className = '',
  dropdownAlign = 'right',
  dropdownPosition = 'bottom'
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showBellMenu, setShowBellMenu] = useState(false);
  const bellMenuRef = useRef<HTMLDivElement>(null);

  // Fetch subscription status and notification level from Supabase
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription-status', channelId, user?.id],
    queryFn: async () => {
      if (!user || !channelId) return null;
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, notification_level')
        .eq('user_id', user.id)
        .eq('channel_id', channelId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!channelId,
    staleTime: 0, // Always fresh for realtime feel
  });

  // Fetch channel owner to determine if current user owns this channel
  const { data: channel } = useQuery({
    queryKey: ['channel-owner', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      const { data, error } = await supabase
        .from('channels')
        .select('user_id, subscribers_count')
        .eq('id', channelId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });

  // Determine button state
  const getButtonState = (): SubscribeState => {
    if (!user) return 'LOGIN_REQUIRED';
    
    const ownerUserId = channelOwnerId || channel?.user_id;
    if (ownerUserId && user.id === ownerUserId) return 'DISABLED';
    
    if (subscription) return 'SHOW_SUBSCRIBED';
    return 'SHOW_SUBSCRIBE';
  };

  const buttonState = getButtonState();
  const isSubscribed = buttonState === 'SHOW_SUBSCRIBED';
  const notificationLevel: NotificationLevel = (subscription?.notification_level as NotificationLevel) || 'PERSONALIZED';

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // Insert subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          channel_id: channelId,
          notification_level: 'PERSONALIZED'
        });
      
      if (subError) throw subError;

      // Increment subscriber count
      const { data: channelData } = await supabase
        .from('channels')
        .select('subscribers_count')
        .eq('id', channelId)
        .single();

      if (channelData) {
        await supabase
          .from('channels')
          .update({ subscribers_count: (channelData.subscribers_count || 0) + 1 })
          .eq('id', channelId);
      }
    },
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['subscription-status', channelId] });
      await queryClient.cancelQueries({ queryKey: ['channel-owner', channelId] });
      
      const previousSub = queryClient.getQueryData(['subscription-status', channelId, user?.id]);
      const previousChannel = queryClient.getQueryData(['channel-owner', channelId]);
      
      // Optimistically set subscribed
      queryClient.setQueryData(['subscription-status', channelId, user?.id], {
        id: 'temp',
        notification_level: 'PERSONALIZED'
      });
      
      // Optimistically increment subscriber count
      queryClient.setQueryData(['channel-owner', channelId], (old: any) => ({
        ...old,
        subscribers_count: (old?.subscribers_count || 0) + 1
      }));
      
      return { previousSub, previousChannel };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['subscription-status', channelId, user?.id], context?.previousSub);
      queryClient.setQueryData(['channel-owner', channelId], context?.previousChannel);
      toast.error('Failed to subscribe');
    },
    onSuccess: () => {
      toast.success('Subscribed!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status', channelId] });
      queryClient.invalidateQueries({ queryKey: ['channel-owner', channelId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['is-subscribed', channelId] });
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
    }
  });

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // Delete subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('channel_id', channelId);
      
      if (subError) throw subError;

      // Decrement subscriber count
      const { data: channelData } = await supabase
        .from('channels')
        .select('subscribers_count')
        .eq('id', channelId)
        .single();

      if (channelData) {
        await supabase
          .from('channels')
          .update({ subscribers_count: Math.max(0, (channelData.subscribers_count || 0) - 1) })
          .eq('id', channelId);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['subscription-status', channelId] });
      await queryClient.cancelQueries({ queryKey: ['channel-owner', channelId] });
      
      const previousSub = queryClient.getQueryData(['subscription-status', channelId, user?.id]);
      const previousChannel = queryClient.getQueryData(['channel-owner', channelId]);
      
      // Optimistically remove subscription
      queryClient.setQueryData(['subscription-status', channelId, user?.id], null);
      
      // Optimistically decrement subscriber count
      queryClient.setQueryData(['channel-owner', channelId], (old: any) => ({
        ...old,
        subscribers_count: Math.max(0, (old?.subscribers_count || 0) - 1)
      }));
      
      return { previousSub, previousChannel };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['subscription-status', channelId, user?.id], context?.previousSub);
      queryClient.setQueryData(['channel-owner', channelId], context?.previousChannel);
      toast.error('Failed to unsubscribe');
    },
    onSuccess: () => {
      toast.success('Unsubscribed');
      setShowBellMenu(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status', channelId] });
      queryClient.invalidateQueries({ queryKey: ['channel-owner', channelId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['is-subscribed', channelId] });
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
    }
  });

  // Update notification level mutation
  const updateNotificationMutation = useMutation({
    mutationFn: async (level: NotificationLevel) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ notification_level: level })
        .eq('user_id', user.id)
        .eq('channel_id', channelId);
      
      if (error) throw error;
    },
    onMutate: async (level) => {
      await queryClient.cancelQueries({ queryKey: ['subscription-status', channelId, user?.id] });
      
      const previousSub = queryClient.getQueryData(['subscription-status', channelId, user?.id]);
      
      queryClient.setQueryData(['subscription-status', channelId, user?.id], (old: any) => ({
        ...old,
        notification_level: level
      }));
      
      return { previousSub };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['subscription-status', channelId, user?.id], context?.previousSub);
      toast.error('Failed to update notification preference');
    },
    onSuccess: (_, level) => {
      const messages: Record<NotificationLevel, string> = {
        'ALL': 'You will receive all notifications',
        'PERSONALIZED': 'You will receive personalized notifications',
        'NONE': 'Notifications turned off'
      };
      toast.success(messages[level]);
      setShowBellMenu(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status', channelId] });
    }
  });

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellMenuRef.current && !bellMenuRef.current.contains(e.target as Node)) {
        setShowBellMenu(false);
      }
    };
    if (showBellMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBellMenu]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBellMenu(!showBellMenu);
  };

  const handleSubscribe = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonState === 'LOGIN_REQUIRED') {
      toast.error('Please sign in to subscribe');
      return;
    }
    subscribeMutation.mutate();
  };

  const handleNotificationSelect = (e: React.MouseEvent, level: NotificationLevel) => {
    e.stopPropagation();
    updateNotificationMutation.mutate(level);
  };

  const handleUnsubscribe = (e: React.MouseEvent) => {
    e.stopPropagation();
    unsubscribeMutation.mutate();
  };

  const getBellIcon = () => {
    const iconSize = size === 'sm' ? 18 : 20;
    if (notificationLevel === 'ALL') return <BellRing size={iconSize} fill="currentColor" />;
    if (notificationLevel === 'NONE') return <BellOff size={iconSize} />;
    return <Bell size={iconSize} />;
  };

  const heightClass = size === 'sm' ? 'h-9' : 'h-9 sm:h-10';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';
  const pxClass = size === 'sm' ? 'px-3' : 'px-4';

  const isLoading = subLoading || subscribeMutation.isPending || unsubscribeMutation.isPending;

  // DISABLED state - channel owner viewing their own channel
  if (buttonState === 'DISABLED') {
    return null; // Hide button for channel owner (like YouTube)
  }

  // SHOW_SUBSCRIBED state - user is subscribed, show bell menu
  if (isSubscribed) {
    return (
      <div className={cn("relative inline-block z-50", className)} ref={bellMenuRef}>
        <div className={cn(
          "flex items-center bg-[#f2f2f2] dark:bg-[#272727] hover:bg-[#e5e5e5] dark:hover:bg-[#3f3f3f] text-[#0f0f0f] dark:text-white rounded-full transition-all group border border-[#0000000d] dark:border-transparent",
          heightClass
        )}>
          <button 
            onClick={handleToggleMenu}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2 font-medium active:scale-95 transition-transform disabled:opacity-50",
              pxClass,
              textClass
            )}
          >
            {isLoading ? (
              <Loader2 size={size === 'sm' ? 18 : 20} className="animate-spin" />
            ) : (
              getBellIcon()
            )}
            {variant !== 'minimal' && <span className="font-semibold">Subscribed</span>}
            <ChevronDown size={16} className={cn(
              "transition-transform duration-200",
              showBellMenu && "rotate-180"
            )} />
          </button>
        </div>

        {showBellMenu && (
          <div 
            className={cn(
              "absolute w-72 bg-white dark:bg-[#282828] border border-[#0000001a] dark:border-[#3f3f3f] rounded-xl shadow-[0_4px_32px_0_rgba(0,0,0,0.15)] z-[9999] py-2 animate-in fade-in zoom-in-95 duration-100",
              dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
              dropdownAlign === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 text-xs font-bold text-[#606060] dark:text-[#aaa] uppercase tracking-wider">
              Notifications
            </div>
            
            <button 
              onClick={(e) => handleNotificationSelect(e, 'ALL')} 
              disabled={updateNotificationMutation.isPending}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 hover:bg-[#f2f2f2] dark:hover:bg-[#3f3f3f] text-sm text-left transition-colors disabled:opacity-50",
                notificationLevel === 'ALL' && "bg-[#f2f2f2] dark:bg-[#3f3f3f]"
              )}
            >
              <div className="flex items-center gap-4 font-medium text-[#0f0f0f] dark:text-white">
                <BellRing size={20} /> All
              </div>
              {notificationLevel === 'ALL' && <Check size={18} className="text-[#0f0f0f] dark:text-white" />}
            </button>
            
            <button 
              onClick={(e) => handleNotificationSelect(e, 'PERSONALIZED')} 
              disabled={updateNotificationMutation.isPending}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 hover:bg-[#f2f2f2] dark:hover:bg-[#3f3f3f] text-sm text-left transition-colors disabled:opacity-50",
                notificationLevel === 'PERSONALIZED' && "bg-[#f2f2f2] dark:bg-[#3f3f3f]"
              )}
            >
              <div className="flex items-center gap-4 font-medium text-[#0f0f0f] dark:text-white">
                <Bell size={20} /> Personalized
              </div>
              {notificationLevel === 'PERSONALIZED' && <Check size={18} className="text-[#0f0f0f] dark:text-white" />}
            </button>
            
            <button 
              onClick={(e) => handleNotificationSelect(e, 'NONE')} 
              disabled={updateNotificationMutation.isPending}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 hover:bg-[#f2f2f2] dark:hover:bg-[#3f3f3f] text-sm text-left transition-colors disabled:opacity-50",
                notificationLevel === 'NONE' && "bg-[#f2f2f2] dark:bg-[#3f3f3f]"
              )}
            >
              <div className="flex items-center gap-4 font-medium text-[#0f0f0f] dark:text-white">
                <BellOff size={20} /> None
              </div>
              {notificationLevel === 'NONE' && <Check size={18} className="text-[#0f0f0f] dark:text-white" />}
            </button>
            
            <div className="h-[1px] bg-[#0000001a] dark:bg-[#3f3f3f] my-2" />
            
            <button 
              onClick={handleUnsubscribe}
              disabled={unsubscribeMutation.isPending}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#f2f2f2] dark:hover:bg-[#3f3f3f] text-sm text-left transition-colors font-medium text-[#0f0f0f] dark:text-white disabled:opacity-50"
            >
              {unsubscribeMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <UserMinus size={20} />
              )}
              Unsubscribe
            </button>
          </div>
        )}
      </div>
    );
  }

  // SHOW_SUBSCRIBE or LOGIN_REQUIRED state - show subscribe button
  return (
    <button 
      onClick={handleSubscribe}
      disabled={isLoading}
      className={cn(
        "bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] rounded-full font-medium hover:bg-[#0f0f0f]/80 dark:hover:bg-white/90 transition-all active:scale-95 shadow-sm shrink-0 flex items-center justify-center disabled:opacity-50",
        heightClass,
        pxClass,
        textClass,
        className
      )}
    >
      {isLoading ? (
        <Loader2 size={size === 'sm' ? 16 : 18} className="animate-spin" />
      ) : (
        'Subscribe'
      )}
    </button>
  );
};

export default SubscribeButton;
