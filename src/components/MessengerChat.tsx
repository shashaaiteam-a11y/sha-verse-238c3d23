import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Send, Phone, Video, MoreVertical,
  Search, Plus, FileText, X, ShieldX, Ban, BellOff, Info, Forward, Pin,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useMessagesRealtime } from '@/hooks/useMessagesRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { useBlockment } from '@/hooks/useBlockment';
import { useChatPartnerPresence, usePresenceTracker } from '@/hooks/usePresenceEnhanced';
import { useTotalUnreadBadge, useConversationUnreadBadge, useMarkConversationRead, useMarkAllConversationsRead } from '@/hooks/useBadgeCount';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChatTypingBar } from './chat/ChatTypingBar';
import { useCall } from '@/modules/chats/components/CallProvider';
import { ChatLayout } from './chat/ChatLayout';
import { ChatUserSearchDialog } from './ChatUserSearchDialog';
import { ChatHeader } from './chat/ChatHeader';
import { TickIndicator } from './chat/TickIndicator';
import { MessageInfoDialog } from './chat/MessageInfoDialog';
import { MessageActionBar } from './chat/MessageActionBar';
import { MessageActionsMenu } from './chat/MessageActionsMenu';
import { ForwardDialog } from './chat/ForwardDialog';
import { PinDurationSheet, DeleteMessageSheet } from './chat/MessageActionSheet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessengerChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string | null;
}

export const MessengerChat = ({ isOpen, onClose, initialUserId }: MessengerChatProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { conversations, isLoading: conversationsLoading, startConversation } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [initializing, setInitializing] = useState(false);
  const { startCall } = useCall();
  // (call dialog now handled globally by GlobalCallHost / CallProvider)
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [infoMessage, setInfoMessage] = useState<any | null>(null);

  // WhatsApp-style message selection / action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<{ id: string; senderName: string; content: string | null; isOwn?: boolean } | null>(null);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [forwardingMessages, setForwardingMessages] = useState<any[] | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const conversationId = selectedConversation?.id || null;
  const otherUserId = selectedConversation?.otherMembers?.[0]?.id;
  const otherUser = selectedConversation?.otherMembers?.[0] || null;

  // Real-time messages with ticks
  const {
    messages,
    isLoading: messagesLoading,
    sendMessage,
    clearMessages,
    editMessage,
    deleteForEveryone,
    deleteForMe,
    unreadCount,
    readReceiptsEnabled,
    getMessageTicks,
  } = useMessagesRealtime(conversationId);

  // Block management
  const { isBlocked, isBlockedBy, blockUser, unblockUser } = useBlockment(otherUserId);

  // Presence tracking
  usePresenceTracker();
  const { isOnline, lastSeen, statusText } = useChatPartnerPresence(otherUserId);

  // Badge count  
  const totalUnread = useTotalUnreadBadge();
  const conversationUnread = useConversationUnreadBadge(conversationId);
  const markConversationRead = useMarkConversationRead();
  const markAllRead = useMarkAllConversationsRead();

  // NOTE: Centralized "open chat = mark read" lives inside useMessagesRealtime.
  // We keep an extra optimistic call here so the green badge in the LEFT list
  // visually disappears the same frame the user taps a chat, even before the
  // server round-trip resolves.
  useEffect(() => {
    if (conversationId && user?.id) {
      markConversationRead.mutate(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id]);

  // Reset selection / reply / edit state when switching conversations
  useEffect(() => {
    setSelectedIds(new Set());
    setReplyTo(null);
    setEditing(null);
  }, [conversationId]);

  // ---------- Pin messages (WhatsApp-style, max 7, LIFO) ----------
  // Stored as conversations.metadata.pinnedMessages: PinEntry[] (newest first).
  // Backwards-compatible: legacy single .pinnedMessage is read as a 1-item array.
  const MAX_PINS = 7;
  const [currentPinIndex, setCurrentPinIndex] = useState(0);

  const { data: pinnedRawList, refetch: refetchPin } = useQuery({
    queryKey: ['conversation-pins', conversationId],
    queryFn: async () => {
      if (!conversationId) return [] as any[];
      const { data } = await supabase
        .from('conversations')
        .select('metadata')
        .eq('id', conversationId)
        .maybeSingle();
      const meta: any = data?.metadata || {};
      const list = Array.isArray(meta.pinnedMessages)
        ? meta.pinnedMessages
        : meta.pinnedMessage
          ? [meta.pinnedMessage]
          : [];
      return list;
    },
    enabled: !!conversationId,
    refetchInterval: 15000,
  });

  // Auto-expire client-side (cron-style cleanup also re-syncs on next write).
  const pinnedMessages: any[] = (pinnedRawList || []).filter(
    (p: any) => !p?.expiresAt || new Date(p.expiresAt) > new Date()
  );

  // Keep banner index in range.
  useEffect(() => {
    if (currentPinIndex >= pinnedMessages.length && pinnedMessages.length > 0) {
      setCurrentPinIndex(0);
    }
  }, [pinnedMessages.length, currentPinIndex]);

  const writePinList = async (next: any[]) => {
    if (!conversationId) return;
    // Optimistic local update so banner + menu re-render instantly,
    // without waiting for the server round-trip or refetch interval.
    queryClient.setQueryData(['conversation-pins', conversationId], next);
    const { data: cur } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('id', conversationId)
      .maybeSingle();
    const prevMeta: any = (cur?.metadata as any) || {};
    // Drop legacy single field; canonical is array.
    const { pinnedMessage: _legacy, ...rest } = prevMeta;
    const meta = { ...rest, pinnedMessages: next };
    const { error } = await supabase
      .from('conversations')
      .update({ metadata: meta } as any)
      .eq('id', conversationId);
    if (error) {
      // Roll back optimistic update on failure
      refetchPin();
      throw error;
    }
    refetchPin();
  };

  // Bottom-sheet state for professional pin/delete choosers.
  const [pinSheetMessage, setPinSheetMessage] = useState<any | null>(null);
  const [deleteSheet, setDeleteSheet] = useState<
    | { ids: string[]; canEveryone: boolean; count: number; source: 'selection' | 'menu' }
    | null
  >(null);

  const performPin = async (message: any, days: 1 | 7 | 30) => {
    if (!message?.id || !user?.id) return;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const entry = {
      id: message.id,
      by: user.id,
      byName: user.email?.split('@')[0] || 'You',
      preview: (message.content || (message.metadata?.mediaUrl ? '[media]' : '')).slice(0, 120),
      pinnedAt: new Date().toISOString(),
      expiresAt,
    };
    try {
      const merged = [entry, ...pinnedMessages].slice(0, MAX_PINS);
      await writePinList(merged);
      setCurrentPinIndex(0);
      toast.success(pinnedMessages.length >= MAX_PINS ? 'Pinned (oldest pin removed)' : 'Message pinned');
    } catch { toast.error('Failed to pin'); }
  };

  const handlePinMessage = async (message: any) => {
    if (!message?.id || !user?.id) return;
    const existing = pinnedMessages.find((p: any) => p.id === message.id);
    if (existing) {
      // Only the user who pinned it can unpin (1:1 chats).
      if (existing.by && existing.by !== user.id) {
        toast.info('Only the user who pinned this message can unpin it');
        return;
      }
      try {
        const next = pinnedMessages.filter((p: any) => p.id !== message.id);
        await writePinList(next);
        toast.success('Message unpinned');
      } catch { toast.error('Failed to unpin'); }
      return;
    }
    setPinSheetMessage(message);
  };


  const handleUnpinCurrent = async () => {
    const target = pinnedMessages[currentPinIndex];
    if (!target) return;
    if (target.by && target.by !== user?.id) {
      toast.info('Only the user who pinned this message can unpin it');
      return;
    }
    try {
      const next = pinnedMessages.filter((p: any) => p.id !== target.id);
      await writePinList(next);
      toast.success('Message unpinned');
    } catch { toast.error('Failed to unpin'); }
  };

  const scrollToPinned = () => {
    const target = pinnedMessages[currentPinIndex];
    if (!target?.id) return;
    const el = document.querySelector(`[data-message-id="${target.id}"]`) as HTMLElement | null;
    if (!el) { toast.info('Message not visible'); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary', 'bg-primary/10');
    setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'bg-primary/10'), 1200);
  };


  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Long-press to enter selection mode (WhatsApp parity). */
  const startLongPress = (id: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }, 450);
  };
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Typing indicator
  const { typingText, isAnyoneTyping, handleUserTyping, stopTyping } = useTypingIndicator(
    conversationId,
    { disabled: !conversationId || isBlockedBy || isBlocked }
  );

  // Mute state per conversation
  const { data: muteData } = useQuery({
    queryKey: ['chat-muted', conversationId, user?.id],
    queryFn: async () => {
      if (!conversationId || !user) return { is_muted: false, muted_until: null };
      const { data } = await supabase
        .from('conversation_members')
        .select('is_muted, muted_until')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();
      return { is_muted: data?.is_muted || false, muted_until: data?.muted_until || null };
    },
    enabled: !!conversationId && !!user,
  });

  const isMuted = muteData?.is_muted && (
    !muteData.muted_until || new Date(muteData.muted_until) > new Date()
  );

  // Mute conversation mutation
  const muteConversation = useMutation({
    mutationFn: async (duration: 'always' | '8hours' | '1week') => {
      if (!conversationId || !user) throw new Error('No conversation');
      let mutedUntil: string | null = null;
      if (duration === '8hours') {
        mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      } else if (duration === '1week') {
        mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }
      const { error } = await supabase
        .from('conversation_members')
        .update({ is_muted: true, muted_until: mutedUntil } as any)
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-muted'] });
      toast.success('Notifications muted');
    }
  });

  const unmuteConversation = useMutation({
    mutationFn: async () => {
      if (!conversationId || !user) throw new Error('No conversation');
      const { error } = await supabase
        .from('conversation_members')
        .update({ is_muted: false, muted_until: null } as any)
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-muted'] });
      toast.success('Notifications unmuted');
    }
  });

  // Realtime: mute state syncs across tabs/devices instantly
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`chat-mute-${conversationId}-${user.id}-${suffix}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_members',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          if (payload.new?.user_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ['chat-muted', conversationId, user.id] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, queryClient]);

  const conversationIds = conversations?.map((c: any) => c.id).filter(Boolean) || [];
  const conversationIdsKey = conversationIds.join(',');

  const { data: allUnreadCounts = {} } = useQuery({
    queryKey: ['unread-counts-all', user?.id, conversationIdsKey],
    queryFn: async () => {
      if (!user || conversationIds.length === 0) return {};
      const { data } = await supabase
        .from('messages')
        .select('conversation_id, id')
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      const counts: Record<string, number> = {};
      data?.forEach((m: any) => {
        counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
    refetchInterval: 15000,
    staleTime: 2000,
  });

  // Realtime: re-fetch per-chat counters the moment a message INSERT/UPDATE arrives
  useEffect(() => {
    if (!user?.id || conversationIds.length === 0) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`chat-list-unread-${user.id}-${suffix}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          if (payload.new?.sender_id !== user.id) {
            queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user.id] });
            queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-counts-all', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-badge', user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversationIdsKey, queryClient]);

  // Filter messages - ensure always an array
  const filteredMessages = isSearching && messageSearchQuery.trim()
    ? (messages || []).filter((m: any) => m.content?.toLowerCase().includes(messageSearchQuery.toLowerCase()))
    : (messages || []);

  // Initialize conversation from URL parameter
  useEffect(() => {
    const initConversation = async () => {
      if (!initialUserId || !conversations || initializing) return;
      
      const existingConvo = conversations.find((c: any) => 
        c.otherMembers?.some((m: any) => m.id === initialUserId)
      );
      
      if (existingConvo) {
        setSelectedConversation(existingConvo);
      } else {
        setInitializing(true);
        try {
          const conversationId = await startConversation.mutateAsync(initialUserId);
          setSelectedConversation({ id: conversationId, otherMembers: [] });
        } catch (error) {
          console.error('Failed to create conversation:', error);
        } finally {
          setInitializing(false);
        }
      }
    };
    
    initConversation();
  }, [initialUserId, conversations, initializing]);

  const filteredConversations = conversations?.filter((convo: any) => {
    const otherUser = convo.otherMembers?.[0];
    if (!searchQuery) return true;
    return otherUser?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm');
    }
    return format(date, 'dd/MM/yy HH:mm');
  };

  const getMessageDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const handleBlockToggle = async () => {
    if (!otherUserId) return;
    try {
      if (isBlocked) {
        await unblockUser.mutateAsync(otherUserId);
      } else {
        if (confirm(`Are you sure you want to block ${otherUser?.display_name}? They won't be able to message or call you.`)) {
          await blockUser.mutateAsync(otherUserId);
        }
      }
    } catch (error) {
      console.error('Block action failed:', error);
    }
  };

  // ---- Selection action helpers (WhatsApp parity) -----------------------
  const selectedMessages = (messages || []).filter((m: any) => selectedIds.has(m.id));
  const selectionCount = selectedMessages.length;
  const onlyOwnSelected = selectionCount > 0 && selectedMessages.every((m: any) => m.sender_id === user?.id);
  const singleSelected = selectionCount === 1 ? selectedMessages[0] : null;

  const isWithinMinutes = (iso: string, minutes: number) => {
    const t = new Date(iso).getTime();
    return (Date.now() - t) / 60000 <= minutes;
  };

  const canEdit = !!singleSelected
    && singleSelected.sender_id === user?.id
    && !!singleSelected.content
    && isWithinMinutes(singleSelected.created_at, 15);

  const canDeleteForEveryone = onlyOwnSelected
    && selectedMessages.every((m: any) => isWithinMinutes(m.created_at, 48 * 60));

  const handleActionReply = () => {
    if (!singleSelected) return;
    const senderName = singleSelected.profiles?.display_name
      || singleSelected.profiles?.username
      || (singleSelected.sender_id === user?.id ? (user?.email?.split('@')[0] || 'You') : (otherUser?.display_name || 'User'));
    setReplyTo({
      id: singleSelected.id,
      senderName,
      content: singleSelected.content,
      isOwn: singleSelected.sender_id === user?.id,
    });
    setEditing(null);
    clearSelection();
  };

  const handleActionEdit = () => {
    if (!canEdit || !singleSelected) return;
    setEditing({ id: singleSelected.id, content: singleSelected.content || '' });
    setReplyTo(null);
    clearSelection();
  };

  const handleActionCopy = async () => {
    const text = selectedMessages
      .map((m: any) => m.content || (m.metadata?.mediaUrl ? '[media]' : ''))
      .filter(Boolean)
      .join('\n');
    if (!text) {
      toast.error('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(selectionCount > 1 ? `${selectionCount} messages copied` : 'Message copied');
    } catch {
      toast.error('Copy failed');
    }
    clearSelection();
  };

  const handleActionStar = () => {
    toast.success(selectionCount > 1 ? `${selectionCount} messages starred` : 'Message starred');
    clearSelection();
  };

  const handleActionDelete = async () => {
    if (selectionCount === 0) return;
    const ids = selectedMessages.map((m: any) => m.id);
    setDeleteSheet({
      ids,
      canEveryone: canDeleteForEveryone,
      count: selectionCount,
      source: 'selection',
    });
  };

  const performDelete = async (mode: 'me' | 'everyone') => {
    if (!deleteSheet) return;
    const { ids, source } = deleteSheet;
    if (mode === 'everyone') {
      for (const id of ids) await deleteForEveryone.mutateAsync(id).catch(() => {});
      toast.success('Deleted for everyone');
    } else {
      for (const id of ids) await deleteForMe.mutateAsync(id).catch(() => {});
      toast.success('Deleted for you');
    }
    if (source === 'selection') clearSelection();
    setDeleteSheet(null);
  };


  const handleActionInfo = () => {
    if (!singleSelected) return;
    setInfoMessage(singleSelected);
    clearSelection();
  };

  const handleActionForward = () => {
    if (selectionCount === 0) return;
    setForwardingMessages(selectedMessages.map((m: any) => ({
      id: m.id,
      content: m.content,
      metadata: m.metadata,
    })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Sidebar - Conversations List */}
      <div className={cn(
        "w-full sm:w-[340px] border-r border-border flex flex-col bg-card",
        selectedConversation && "hidden sm:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src="/sha-verse-logo.jpeg" alt="Sha-Verse" />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">S</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg">Chats</h2>
                  {totalUnread > 0 && (
                    <span
                      className="bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-sm animate-in fade-in zoom-in duration-200"
                      aria-label={`${totalUnread} unread messages`}
                    >
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </div>
                {totalUnread > 0 && (
                  <p className="text-xs text-muted-foreground">{totalUnread} unread</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    disabled={totalUnread === 0 || markAllRead.isPending}
                    onClick={() => {
                      markAllRead.mutate(undefined, {
                        onSuccess: () => toast.success('All chats marked as read'),
                        onError: () => toast.error('Failed to mark all as read'),
                      });
                    }}
                  >
                    <Send className="w-4 h-4 mr-3" />
                    Mark all as read
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-primary/10 text-primary"
                onClick={() => setShowUserSearch(true)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start new chat"
              className="pl-10 bg-secondary border-0 rounded-full"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConversations && filteredConversations.length > 0 ? (
            <div>
              {filteredConversations.map((convo: any) => {
                const convoOtherUser = convo.otherMembers?.[0];
                const isSelected = selectedConversation?.id === convo.id;
                const convoUnreadCount = allUnreadCounts?.[convo.id] || 0;
                const convoIsMuted = muteData?.is_muted || false;
                
                return (
                  <ConversationListItem
                    key={convo.id}
                    convo={convo}
                    otherUser={convoOtherUser}
                    isSelected={isSelected}
                    isBlocked={isBlocked && convoOtherUser?.id === otherUserId}
                    isMuted={convoIsMuted}
                    unreadCount={convoUnreadCount}
                    currentUserId={user?.id}
                    onClick={() => setSelectedConversation(convo)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a chat from a friend's profile
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 h-full overflow-hidden bg-background",
        !selectedConversation && "hidden sm:flex"
      )}>
        {selectedConversation ? (
          <ChatLayout
            header={
              selectionCount > 0 ? (
                <MessageActionBar
                  count={selectionCount}
                  canReply={selectionCount === 1}
                  canEdit={canEdit}
                  canDeleteForEveryone={canDeleteForEveryone}
                  canInfo={selectionCount === 1 && !!singleSelected && singleSelected.sender_id === user?.id}
                  onCancel={clearSelection}
                  onReply={handleActionReply}
                  onForward={handleActionForward}
                  onEdit={handleActionEdit}
                  onCopy={handleActionCopy}
                  onStar={handleActionStar}
                  onDelete={handleActionDelete}
                  onInfo={handleActionInfo}
                />
              ) : isSearching ? (
                <div className="flex items-center gap-2 p-3 border-b bg-background sticky top-0 z-40" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsSearching(false);
                      setMessageSearchQuery('');
                    }}
                    className="flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      placeholder="Search messages..."
                      className="pl-10 bg-secondary border-0 rounded-full"
                    />
                  </div>
                  {messageSearchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMessageSearchQuery('')}
                      className="flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              ) : (
                <ChatHeader
                  otherUser={otherUser ? {
                    id: otherUser.id || '',
                    display_name: otherUser.display_name || 'Unknown User',
                    username: otherUser.username || '',
                    avatar_url: otherUser.avatar_url
                  } : null}
                  isOnline={isOnline || false}
                  lastSeen={lastSeen || null}
                  isBlocked={isBlocked || false}
                  isBlockedBy={isBlockedBy || false}
                  isMuted={isMuted || false}
                  onBack={() => setSelectedConversation(null)}
                  onCall={() => {
                    if (otherUser) startCall({
                      id: otherUser.id,
                      display_name: otherUser.display_name || 'User',
                      avatar_url: otherUser.avatar_url,
                    }, 'voice');
                  }}
                  onVideoCall={() => {
                    if (otherUser) startCall({
                      id: otherUser.id,
                      display_name: otherUser.display_name || 'User',
                      avatar_url: otherUser.avatar_url,
                    }, 'video');
                  }}
                  onBlock={handleBlockToggle}
                  onMute={(duration) => muteConversation.mutate(duration || 'always')}
                  onUnmute={() => unmuteConversation.mutate()}
                  onClearChat={() => {
                    if (confirm('Clear all messages in this chat?')) {
                      clearMessages.mutate();
                    }
                  }}
                  onSearchToggle={() => setIsSearching(true)}
                  isLoading={blockUser.isPending || unblockUser.isPending}
                />
              )
            }
            messages={
              filteredMessages.length > 0 ? (
                <div className="space-y-2">
                  {pinnedMessages.length > 0 && (() => {
                    const current = pinnedMessages[Math.min(currentPinIndex, pinnedMessages.length - 1)];
                    const total = pinnedMessages.length;
                    const canUnpinBanner = !current.by || current.by === user?.id;
                    return (
                      <div
                        onClick={scrollToPinned}
                        className="sticky top-0 z-20 -mt-2 mb-2 flex items-center gap-2 px-3 py-2 rounded-md bg-muted/80 backdrop-blur border border-border cursor-pointer hover:bg-muted"
                      >
                        <Pin className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span>Pinned</span>
                            <span className="opacity-70">[{Math.min(currentPinIndex, total - 1) + 1}/{total}]</span>
                            <span className="mx-1">·</span>
                            <span>{current.by === user?.id ? 'You' : (otherUser?.display_name || current.byName || 'Pinned')}</span>
                          </div>
                          <div className="text-xs truncate">{current.preview || 'Pinned message'}</div>
                        </div>
                        {total > 1 && (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setCurrentPinIndex((i) => (i - 1 + total) % total); }}
                              aria-label="Previous pin"
                              className="p-1 rounded-full hover:bg-background/50 text-muted-foreground"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setCurrentPinIndex((i) => (i + 1) % total); }}
                              aria-label="Next pin"
                              className="p-1 rounded-full hover:bg-background/50 text-muted-foreground"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {canUnpinBanner && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleUnpinCurrent(); }}
                            aria-label="Unpin"
                            className="p-1 rounded-full hover:bg-background/50 text-muted-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {filteredMessages.map((message: any, idx: number) => {
                    if (!message || message.deleted_for_all) return null;
                    const isOwn = message.sender_id === user?.id;
                    const showDateLabel = !isSearching && (idx === 0 ||
                      getMessageDateLabel(new Date(filteredMessages[idx - 1]?.created_at)) !==
                      getMessageDateLabel(new Date(message.created_at)));
                    const metadata = message.metadata as {
                      mediaUrl?: string;
                      mediaType?: string;
                      forwarded?: boolean;
                      replyTo?: { id: string; senderName: string; content: string | null };
                    } | null;
                    const tickStatus = getMessageTicks(message);
                    const isSelected = selectedIds.has(message.id);
                    const inSelectionMode = selectedIds.size > 0;
                    // WhatsApp parity: deleted-for-everyone leaves an empty content row
                    const isDeleted = !message.content && !metadata?.mediaUrl;

                    const handleBubbleClick = () => {
                      if (inSelectionMode) toggleSelect(message.id);
                    };

                    return (
                      <div
                        key={message.id || idx}
                        data-message-id={message.id}
                        onClick={handleBubbleClick}
                        onTouchStart={() => startLongPress(message.id)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          toggleSelect(message.id);
                        }}
                        className={cn(
                          "transition-colors rounded-md scroll-mt-20",
                          isSelected && "bg-primary/10"
                        )}
                      >
                        {showDateLabel && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-card rounded-full text-xs text-muted-foreground shadow-sm">
                              {getMessageDateLabel(new Date(message.created_at))}
                            </span>
                          </div>
                        )}
                        <div className={cn(
                          "flex group/msg items-center gap-1 px-1 py-0.5",
                          isOwn ? "justify-end" : "justify-start"
                        )}>
                          {/* Info button on the LEFT of own bubbles (hover/touch) */}
                          {isOwn && !inSelectionMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInfoMessage(message);
                              }}
                              aria-label="Message info"
                              className="opacity-0 group-hover/msg:opacity-100 focus:opacity-100 active:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          )}

                          <div className={cn(
                            "relative max-w-[75%] px-3 py-2 rounded-lg shadow-sm",
                            isOwn
                              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100 rounded-tr-none"
                              : "bg-card text-card-foreground rounded-tl-none",
                            isDeleted && "italic opacity-70"
                          )}>
                            {!inSelectionMode && !isDeleted && (
                              <MessageActionsMenu
                                isOwn={isOwn}
                                canEdit={isOwn && !!message.content && isWithinMinutes(message.created_at, 15)}
                                canDeleteForEveryone={isOwn && isWithinMinutes(message.created_at, 48 * 60)}
                                isDeleted={isDeleted}
                                onReply={() => {
                                  const senderName = message.profiles?.display_name
                                    || message.profiles?.username
                                    || (isOwn ? (user?.email?.split('@')[0] || 'You') : (otherUser?.display_name || 'User'));
                                  setReplyTo({ id: message.id, senderName, content: message.content, isOwn });
                                  setEditing(null);
                                }}
                                onForward={() => setForwardingMessages([{ id: message.id, content: message.content, metadata: message.metadata }])}
                                onCopy={async () => {
                                  const text = message.content || (message.metadata?.mediaUrl ? '[media]' : '');
                                  if (!text) { toast.error('Nothing to copy'); return; }
                                  try { await navigator.clipboard.writeText(text); toast.success('Message copied'); }
                                  catch { toast.error('Copy failed'); }
                                }}
                                onPin={() => handlePinMessage(message)}
                                isPinned={pinnedMessages.some((p: any) => p.id === message.id)}
                                canUnpin={(() => {
                                  const p = pinnedMessages.find((x: any) => x.id === message.id);
                                  // Owner-only unpin in 1:1 chats.
                                  return !p || !p.by || p.by === user?.id;
                                })()}
                                onEdit={() => {
                                  setEditing({ id: message.id, content: message.content || '' });
                                  setReplyTo(null);
                                }}
                                onDelete={() => {
                                  const canDelAll = isOwn && isWithinMinutes(message.created_at, 48 * 60);
                                  setDeleteSheet({
                                    ids: [message.id],
                                    canEveryone: canDelAll,
                                    count: 1,
                                    source: 'menu',
                                  });
                                }}
                                onInfo={() => setInfoMessage(message)}
                                onSelect={() => toggleSelect(message.id)}
                              />
                            )}
                            {/* Forwarded label (WhatsApp parity) */}
                            {metadata?.forwarded && !isDeleted && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground italic mb-1">
                                <Forward className="w-3 h-3" />
                                Forwarded
                              </div>
                            )}

                            {/* Reply preview chip inside the bubble */}
                            {metadata?.replyTo && !isDeleted && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const targetId = metadata.replyTo?.id;
                                  if (!targetId) return;
                                  const el = document.querySelector<HTMLElement>(`[data-message-id="${targetId}"]`);
                                  if (!el) { toast.message('Original message not found'); return; }
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  el.classList.add('ring-2', 'ring-primary', 'bg-primary/10');
                                  window.setTimeout(() => {
                                    el.classList.remove('ring-2', 'ring-primary', 'bg-primary/10');
                                  }, 1200);
                                }}
                                className="block w-full text-left mb-1 px-2 py-1 rounded bg-black/5 dark:bg-white/10 border-l-2 border-primary hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                              >
                                <p className="text-[11px] font-semibold text-primary truncate">
                                  {metadata.replyTo.senderName || 'Reply'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {metadata.replyTo.content || 'Media'}
                                </p>
                              </button>
                            )}

                            {metadata?.mediaUrl && !isDeleted && (
                              <div className="mb-2">
                                {metadata.mediaType === 'image' && (
                                  <img
                                    src={metadata.mediaUrl}
                                    alt="Shared image"
                                    className="rounded-lg max-w-full cursor-pointer hover:opacity-90"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!inSelectionMode) window.open(metadata.mediaUrl, '_blank');
                                    }}
                                  />
                                )}
                                {metadata.mediaType === 'video' && (
                                  <video
                                    src={metadata.mediaUrl}
                                    controls
                                    className="rounded-lg max-w-full"
                                  />
                                )}
                                {metadata.mediaType === 'file' && (
                                  <a
                                    href={metadata.mediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => inSelectionMode && e.preventDefault()}
                                    className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg hover:bg-secondary text-foreground"
                                  >
                                    <FileText className="w-8 h-8 text-primary" />
                                    <span className="text-sm underline">Download File</span>
                                  </a>
                                )}
                              </div>
                            )}

                            {isDeleted ? (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Ban className="w-3.5 h-3.5" />
                                This message was deleted
                              </p>
                            ) : message.content && (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}

                            <div className="flex items-center justify-end gap-1 mt-1">
                              {message.edited && !isDeleted && (
                                <span className="text-[10px] text-muted-foreground italic mr-1">edited</span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(message.created_at), 'h:mm a')}
                              </span>
                              {isOwn && !isDeleted && (
                                <TickIndicator status={tickStatus} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : undefined
            }
            inputBar={
              isBlocked ? (
                <div className="p-4 border-t border-border bg-card">
                  <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
                    <ShieldX className="w-5 h-5 text-destructive" />
                    {isBlockedBy ? (
                      <span className="text-sm text-red-500">You are blocked by this user</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-foreground">You blocked this contact</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary"
                          onClick={handleBlockToggle}
                        >
                          Unblock
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <ChatTypingBar
                  onSendMessage={(content, mediaUrl, mediaType) => {
                    stopTyping(user?.email?.split('@')[0] || 'User');
                    sendMessage.mutate({
                      content,
                      mediaUrl,
                      mediaType,
                      replyTo: replyTo
                        ? { id: replyTo.id, senderName: replyTo.senderName, content: replyTo.content }
                        : null,
                    });
                    setReplyTo(null);
                  }}
                  isSending={sendMessage.isPending}
                  onTyping={() => !isBlockedBy && handleUserTyping(user?.email?.split('@')[0] || 'User')}
                  onStopTyping={() => stopTyping(user?.email?.split('@')[0] || 'User')}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                  editing={editing}
                  onCancelEdit={() => setEditing(null)}
                  onSubmitEdit={(newContent) => {
                    if (!editing) return;
                    editMessage.mutate(
                      { messageId: editing.id, newContent },
                      {
                        onSuccess: () => toast.success('Message updated'),
                        onError: (err: any) => toast.error(err?.message || 'Edit failed'),
                      }
                    );
                    setEditing(null);
                  }}
                />
              )
            }
            isLoading={messagesLoading}
            emptyState={
              <div className="text-center text-muted-foreground">
                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-4 bg-primary/10">
                  <img src="/sha-verse-logo.jpeg" alt="Sha-Verse" className="w-full h-full object-cover" />
                </div>
                <p>No messages yet</p>
                <p className="text-sm mt-1">Say hello!</p>
              </div>
            }
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-6 bg-primary/10">
                <img src="/sha-verse-logo.jpeg" alt="Sha-Verse" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Sha-Verse Messenger</h3>
              <p className="max-w-sm text-muted-foreground">
                Send and receive messages with your friends. Select a conversation to start chatting.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Call dialogs are now rendered globally by GlobalCallHost (CallProvider) */}

      {/* User Search Dialog for Starting New Conversations */}
      <ChatUserSearchDialog
        open={showUserSearch}
        onOpenChange={setShowUserSearch}
        onSelectUser={async (selectedUser) => {
          try {
            const conversationId = await startConversation.mutateAsync(selectedUser.id);

            // Try existing conversation first
            const existing = conversations?.find((c: any) => c.id === conversationId);
            if (existing) {
              setSelectedConversation(existing);
            } else {
              // Open chat immediately with a synthetic conversation; the list will refresh in background
              setSelectedConversation({
                id: conversationId,
                otherUser: {
                  id: selectedUser.id,
                  display_name: selectedUser.display_name,
                  username: selectedUser.username,
                  avatar_url: selectedUser.avatar_url,
                },
                last_message_at: new Date().toISOString(),
              } as any);
            }
            toast.success(`Chat started with ${selectedUser.display_name}`);
          } catch (error) {
            toast.error('Failed to start conversation');
          }
        }}
      />

      {/* WhatsApp-style Message Info dialog (Sent / Delivered / Read times + realtime) */}
      <MessageInfoDialog
        open={!!infoMessage}
        onOpenChange={(o) => !o && setInfoMessage(null)}
        message={infoMessage}
      />

      {/* WhatsApp-style Forward picker */}
      <ForwardDialog
        open={!!forwardingMessages}
        onOpenChange={(o) => !o && setForwardingMessages(null)}
        conversations={conversations || []}
        excludeConversationId={conversationId}
        messages={forwardingMessages || []}
        onDone={() => {
          setForwardingMessages(null);
          clearSelection();
        }}
      />

      {/* Professional pin-duration chooser */}
      <PinDurationSheet
        open={!!pinSheetMessage}
        onOpenChange={(o) => !o && setPinSheetMessage(null)}
        onChoose={(days) => {
          const msg = pinSheetMessage;
          setPinSheetMessage(null);
          if (msg) performPin(msg, days);
        }}
      />

      {/* Professional delete chooser */}
      <DeleteMessageSheet
        open={!!deleteSheet}
        onOpenChange={(o) => !o && setDeleteSheet(null)}
        count={deleteSheet?.count ?? 1}
        canDeleteForEveryone={!!deleteSheet?.canEveryone}
        onChoose={(mode) => performDelete(mode)}
      />
    </div>
  );
};

// WhatsApp-style: keep first N words, append "..." if more
const truncateNameWords = (name: string, maxWords: number = 3): string => {
  if (!name) return 'Unknown User';
  const words = name.trim().split(/\s+/);
  if (words.length <= maxWords) return name;
  return words.slice(0, maxWords).join(' ') + '...';
};

// Conversation List Item with online status & blocked indicator
const ConversationListItem = ({ convo, otherUser, isSelected, isBlocked, isMuted, unreadCount, currentUserId, onClick }: {
  convo: any;
  otherUser: any;
  isSelected: boolean;
  isBlocked: boolean;
  isMuted: boolean;
  unreadCount: number;
  currentUserId?: string;
  onClick: () => void;
}) => {
  const { isOnline } = useChatPartnerPresence(otherUser?.id);

  if (!otherUser) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors border-b border-border",
        isSelected && "bg-primary/10"
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          {otherUser?.avatar_url && <AvatarImage src={otherUser.avatar_url} />}
          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
            {otherUser?.display_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        {isBlocked ? (
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-destructive rounded-full border-2 border-card flex items-center justify-center">
            <Ban className="w-2.5 h-2.5 text-white" />
          </div>
        ) : isOnline ? (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card animate-pulse" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0 text-left">
        {/* Row 1: Name only (WhatsApp-style 3-word + ellipsis truncation) */}
        <div className="flex items-center gap-1 min-w-0">
          <h4 className="font-semibold text-sm truncate min-w-0 flex-1">
            {truncateNameWords(otherUser?.display_name || 'Unknown User', 3)}
          </h4>
          {isMuted && (
            <BellOff className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        {/* Row 2: Ticks + last message + time + unread badge */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {convo.lastMessage?.sender_id === currentUserId && (
              <TickIndicator 
                status={convo.lastMessage?.is_read ? 'read' : convo.lastMessage?.is_delivered ? 'delivered' : 'sent'}
              />
            )}
            <p className="text-sm text-muted-foreground truncate">
              {isBlocked
                ? '🚫 Blocked'
                : (() => {
                    const text = convo.lastMessage?.content || 'No messages yet';
                    return text.length > 16 ? `${text.slice(0, 16)}...` : text;
                  })()}
            </p>
            {convo.lastMessage && (
              <span
                className={cn(
                  "text-[11px] flex-shrink-0 ml-1 whitespace-nowrap",
                  unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                · {formatDistanceToNow(new Date(convo.lastMessage.created_at), { addSuffix: false })}
              </span>
            )}
          </div>
          {unreadCount > 0 && !isBlocked && (
            <span
              className="bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-950 text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0 shadow-sm animate-in fade-in zoom-in duration-200"
              aria-label={`${unreadCount} unread`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
