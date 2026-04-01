import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Send, Phone, Video, MoreVertical, Check, CheckCheck,
  Search, Plus, FileText, Bell, BellOff, CheckSquare2, X, ShieldX, Ban
} from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { useIsUserOnline } from '@/hooks/usePresence';
import { useMarkMessagesRead } from '@/hooks/useReadReceipts';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChatTypingBar } from './chat/ChatTypingBar';
import { ChatHeaderMenu } from './chat/ChatHeaderMenu';
import { VideoCallDialog } from './chat/VideoCallDialog';
import { ChatLayout } from './chat/ChatLayout';
import { ChatUserSearchDialog } from './ChatUserSearchDialog';
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
  const { blockUser, unblockUser, blockedUsers } = useProfileSettings();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [initializing, setInitializing] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  
  // Search state for messages within chat
  const [isSearching, setIsSearching] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');

  const { messages, isLoading: messagesLoading, sendMessage, clearMessages } = useMessages(
    selectedConversation?.id || null
  );

  const otherUserId = selectedConversation?.otherMembers?.[0]?.id;
  const otherUserName = selectedConversation?.otherMembers?.[0]?.display_name || 'User';

  // Online/Last seen for current chat partner
  const { isOnline: isOtherUserOnline, lastSeen: otherUserLastSeen } = useIsUserOnline(otherUserId);

  // Mark messages as read when conversation is opened
  useMarkMessagesRead(selectedConversation?.id || null);

  // Check if the other user is blocked by current user
  const isOtherUserBlocked = blockedUsers?.some(
    (b: any) => b.blocked_id === otherUserId
  ) || false;

  // Check if current user is blocked by the other user
  const { data: isBlockedByOther } = useQuery({
    queryKey: ['blocked-by-other', otherUserId, user?.id],
    queryFn: async () => {
      if (!otherUserId || !user) return false;
      const { data } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', otherUserId)
        .eq('blocked_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!otherUserId && !!user,
  });

  // Only the BLOCKER sees restricted UI. Blocked person can still type (WhatsApp silent block).
  const isChatBlocked = isOtherUserBlocked;

  // Mute state per conversation (with muted_until support)
  const { data: muteData } = useQuery({
    queryKey: ['chat-muted', selectedConversation?.id, user?.id],
    queryFn: async () => {
      if (!selectedConversation?.id || !user) return { is_muted: false, muted_until: null };
      const { data } = await supabase
        .from('conversation_members')
        .select('is_muted, muted_until')
        .eq('conversation_id', selectedConversation.id)
        .eq('user_id', user.id)
        .maybeSingle();
      return { is_muted: data?.is_muted || false, muted_until: data?.muted_until || null };
    },
    enabled: !!selectedConversation?.id && !!user,
  });

  // Check if mute has expired
  const isMuted = muteData?.is_muted && (
    !muteData.muted_until || new Date(muteData.muted_until) > new Date()
  );

  // All conversations mute status for chat list 🔕 icon
  const { data: allMuteStatuses } = useQuery({
    queryKey: ['all-mute-statuses', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data } = await supabase
        .from('conversation_members')
        .select('conversation_id, is_muted, muted_until')
        .eq('user_id', user.id)
        .eq('is_muted', true);
      const statuses: Record<string, boolean> = {};
      data?.forEach((m: any) => {
        const stillMuted = !m.muted_until || new Date(m.muted_until) > new Date();
        if (stillMuted) statuses[m.conversation_id] = true;
      });
      return statuses;
    },
    enabled: !!user,
  });

  const muteConversation = useMutation({
    mutationFn: async (duration: 'always' | '8hours' | '1week') => {
      if (!selectedConversation?.id || !user) throw new Error('No conversation');
      let mutedUntil: string | null = null;
      if (duration === '8hours') {
        mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      } else if (duration === '1week') {
        mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }
      const { error } = await supabase
        .from('conversation_members')
        .update({ is_muted: true, muted_until: mutedUntil } as any)
        .eq('conversation_id', selectedConversation.id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-muted'] });
      queryClient.invalidateQueries({ queryKey: ['all-mute-statuses'] });
      toast.success('Notifications muted');
    }
  });

  const unmuteConversation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.id || !user) throw new Error('No conversation');
      const { error } = await supabase
        .from('conversation_members')
        .update({ is_muted: false, muted_until: null } as any)
        .eq('conversation_id', selectedConversation.id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-muted'] });
      queryClient.invalidateQueries({ queryKey: ['all-mute-statuses'] });
      toast.success('Notifications unmuted');
    }
  });

  // Unread count per conversation
  const { data: unreadCounts } = useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data } = await supabase
        .from('messages')
        .select('conversation_id, id')
        .eq('is_read', false)
        .neq('sender_id', user.id);
      
      const counts: Record<string, number> = {};
      data?.forEach((m: any) => {
        counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  // Mark all conversations as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      // Get all conversation IDs for this user
      const { data: memberData } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);
      
      if (!memberData?.length) return;
      
      const conversationIds = memberData.map((m: any) => m.conversation_id);
      
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success('All chats marked as read');
    }
  });

  // Realtime subscription for block/unblock updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-blocks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_blocks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
          queryClient.invalidateQueries({ queryKey: ['blocked-by-other'] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Realtime for unread counts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-counts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Filter messages based on search query
  const filteredMessages = isSearching && messageSearchQuery.trim()
    ? messages?.filter((m: any) => m.content?.toLowerCase().includes(messageSearchQuery.toLowerCase()))
    : messages;

  // Handle initial user ID - find or create conversation
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

  const getOnlineStatusText = () => {
    if (isChatBlocked) return null;
    if (isOtherUserOnline) return 'Online';
    if (otherUserLastSeen) {
      return `Last seen ${formatDistanceToNow(otherUserLastSeen, { addSuffix: true })}`;
    }
    return 'Offline';
  };

  const handleBlockUser = () => {
    if (!otherUserId) return;
    if (window.confirm(`Are you sure you want to block ${otherUserName}? They won't be able to message or call you.`)) {
      blockUser.mutate(
        { userId: otherUserId, reason: 'Blocked from chat' },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blocked-by-other'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        }
      );
    }
  };

  const handleUnblockUser = () => {
    if (!otherUserId) return;
    const blockRecord = blockedUsers?.find((b: any) => b.blocked_id === otherUserId);
    if (!blockRecord) return;
    unblockUser.mutate(blockRecord.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['blocked-by-other'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    });
  };

  // Get tick icon for message status
  const renderMessageTicks = (message: any) => {
    if (message.sender_id !== user?.id) return null;
    
    if (message.is_read) {
      // Blue double tick = Read
      return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
    }
    // Grey single tick = Sent (not yet read)
    return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* Sidebar - Conversations List */}
      <div className={cn(
        "w-full sm:w-[340px] border-r border-border flex flex-col bg-card",
        selectedConversation && "hidden sm:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className="h-10 w-10">
                {user && <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>}
              </Avatar>
              <div>
                <h2 className="font-bold text-lg">Chats</h2>
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
                  <DropdownMenuItem onClick={() => markAllAsRead.mutate()}>
                    <CheckSquare2 className="w-4 h-4 mr-3" />
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
                const otherUser = convo.otherMembers?.[0];
                const isSelected = selectedConversation?.id === convo.id;
                const isConvoBlocked = blockedUsers?.some((b: any) => b.blocked_id === otherUser?.id);
                const unreadCount = unreadCounts?.[convo.id] || 0;
                
                return (
                  <ConversationListItem
                    key={convo.id}
                    convo={convo}
                    otherUser={otherUser}
                    isSelected={isSelected}
                    isBlocked={isConvoBlocked}
                    unreadCount={unreadCount}
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
        "flex-1 h-full overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9IiNmMGYyZjUiLz4KPHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0icmdiYSgwLDAsMCwwLjAzKSIvPgo8L3N2Zz4=')] dark:bg-[#0b141a]",
        !selectedConversation && "hidden sm:flex"
      )}>
        {selectedConversation ? (
          <ChatLayout
            header={
              <>
              <div className="p-3 bg-card border-b border-border flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    {selectedConversation.otherMembers?.[0]?.avatar_url && (
                      <AvatarImage src={selectedConversation.otherMembers[0].avatar_url} />
                    )}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {selectedConversation.otherMembers?.[0]?.display_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isChatBlocked && isOtherUserOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {otherUserName || 'Chat'}
                  </h3>
                  {isChatBlocked ? (
                    <p className="text-xs text-destructive">Blocked</p>
                  ) : (
                    <p className={cn(
                      "text-xs",
                      isOtherUserOnline ? "text-emerald-600" : "text-muted-foreground"
                    )}>
                      {getOnlineStatusText()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {!isChatBlocked && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full text-primary"
                        onClick={() => {
                          setIsVideoCall(true);
                          setShowCallDialog(true);
                        }}
                      >
                        <Video className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full text-primary"
                        onClick={() => {
                          setIsVideoCall(false);
                          setShowCallDialog(true);
                        }}
                      >
                        <Phone className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                  <ChatHeaderMenu 
                    conversationId={selectedConversation.id}
                    otherUserId={otherUserId}
                    otherUserName={otherUserName}
                    isBlocked={isOtherUserBlocked}
                    isMuted={isMuted || false}
                    onClearChat={() => {
                        if (window.confirm('Are you sure you want to clear all messages in this chat? This action only clears messages on your side.')) {
                            clearMessages.mutate();
                        }
                    }}
                    onSearchToggle={() => {
                        setIsSearching(!isSearching);
                        if (isSearching) setMessageSearchQuery('');
                    }}
                    onBlock={handleBlockUser}
                    onUnblock={handleUnblockUser}
                    onMuteToggle={() => toggleMute.mutate()}
                  />
                </div>
              </div>
              
              {/* Search bar beneath header if searching is active */}
              {isSearching && (
                <div className="p-2 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search messages..."
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        className="pl-9 bg-background focus-visible:ring-1"
                        autoFocus
                      />
                      {messageSearchQuery && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                          onClick={() => setMessageSearchQuery('')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => {
                        setIsSearching(false);
                        setMessageSearchQuery('');
                      }}
                      title="Close search"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
            }
            messages={
              filteredMessages && filteredMessages.length > 0 ? (
                <div className="space-y-2">
                  {filteredMessages.map((message: any, idx: number) => {
                    const isOwn = message.sender_id === user?.id;
                    const showDateLabel = !isSearching && (idx === 0 || 
                      getMessageDateLabel(new Date(filteredMessages[idx - 1].created_at)) !== 
                      getMessageDateLabel(new Date(message.created_at)));
                    const metadata = message.metadata as { mediaUrl?: string; mediaType?: string } | null;

                    return (
                      <div key={message.id}>
                        {showDateLabel && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-card rounded-full text-xs text-muted-foreground shadow-sm">
                              {getMessageDateLabel(new Date(message.created_at))}
                            </span>
                          </div>
                        )}
                        <div className={cn(
                          "flex",
                          isOwn ? "justify-end" : "justify-start"
                        )}>
                          <div className={cn(
                            "max-w-[75%] px-3 py-2 rounded-lg shadow-sm",
                            isOwn 
                              ? "bg-emerald-100 dark:bg-emerald-900/50 rounded-tr-none" 
                              : "bg-card rounded-tl-none"
                          )}>
                            {/* Media Content */}
                            {metadata?.mediaUrl && (
                              <div className="mb-2">
                                {metadata.mediaType === 'image' && (
                                  <img 
                                    src={metadata.mediaUrl} 
                                    alt="Shared image" 
                                    className="rounded-lg max-w-full cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(metadata.mediaUrl, '_blank')}
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
                                    className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg hover:bg-secondary"
                                  >
                                    <FileText className="w-8 h-8 text-primary" />
                                    <span className="text-sm underline">Download File</span>
                                  </a>
                                )}
                              </div>
                            )}
                            {message.content && (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}
                            <div className="flex items-center justify-end gap-1 mt-1 text-muted-foreground">
                              <span className="text-[10px]">
                                {format(new Date(message.created_at), 'HH:mm')}
                              </span>
                              {renderMessageTicks(message)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null
            }
            inputBar={
              isChatBlocked ? (
                <div className="p-4 border-t border-border bg-card">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
                    <ShieldX className="w-5 h-5 text-destructive" />
                    {isOtherUserBlocked ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm">You blocked this contact.</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary"
                          onClick={handleUnblockUser}
                        >
                          Unblock
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm">You can't send messages to this contact.</span>
                    )}
                  </div>
                </div>
              ) : (
                <ChatTypingBar 
                  onSendMessage={(content, mediaUrl, mediaType) => {
                    sendMessage.mutate({ content, mediaUrl, mediaType });
                  }}
                  isSending={sendMessage.isPending}
                />
              )
            }
            isLoading={messagesLoading}
            emptyState={
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">Say hello!</p>
              </div>
            }
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sha-Verse Messenger</h3>
              <p className="text-muted-foreground max-w-sm">
                Send and receive messages with your friends. Select a conversation to start chatting.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Video/Voice Call Dialog */}
      <VideoCallDialog
        isOpen={showCallDialog}
        onClose={() => setShowCallDialog(false)}
        otherUser={selectedConversation?.otherMembers?.[0] || null}
        isVideoCall={isVideoCall}
      />

      {/* User Search Dialog for Starting New Conversations */}
      <ChatUserSearchDialog
        open={showUserSearch}
        onOpenChange={setShowUserSearch}
        onSelectUser={async (selectedUser) => {
          try {
            const conversationId = await startConversation.mutateAsync(selectedUser.id);
            const newConvo = conversations?.find((c: any) => c.id === conversationId);
            if (newConvo) {
              setSelectedConversation(newConvo);
            }
            toast.success(`Chat started with ${selectedUser.display_name}`);
          } catch (error: any) {
            toast.error('Failed to start conversation');
          }
        }}
      />
    </div>
  );
};

// Conversation List Item with online status & blocked indicator
const ConversationListItem = ({ convo, otherUser, isSelected, isBlocked, unreadCount, currentUserId, onClick }: {
  convo: any;
  otherUser: any;
  isSelected: boolean;
  isBlocked: boolean;
  unreadCount: number;
  currentUserId?: string;
  onClick: () => void;
}) => {
  const { isOnline } = useIsUserOnline(otherUser?.id);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors",
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
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-sm truncate">
            {otherUser?.display_name || 'Unknown User'}
          </h4>
          {convo.lastMessage && (
            <span className={cn(
              "text-[11px]",
              unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"
            )}>
              {formatDistanceToNow(new Date(convo.lastMessage.created_at), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {convo.lastMessage?.sender_id === currentUserId && (
              convo.lastMessage?.is_read 
                ? <CheckCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                : <Check className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <p className="text-sm text-muted-foreground truncate">
              {isBlocked ? '🚫 Blocked' : (convo.lastMessage?.content || 'No messages yet')}
            </p>
          </div>
          {unreadCount > 0 && !isBlocked && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
