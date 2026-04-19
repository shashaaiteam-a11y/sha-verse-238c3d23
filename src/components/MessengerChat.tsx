import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Send, Phone, Video, MoreVertical,
  Search, Plus, FileText, X, ShieldX, Ban, BellOff
} from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useMessagesRealtime } from '@/hooks/useMessagesRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { useBlockment } from '@/hooks/useBlockment';
import { useChatPartnerPresence, usePresenceTracker } from '@/hooks/usePresenceEnhanced';
import { useTotalUnreadBadge, useConversationUnreadBadge, useMarkAllConversationsRead } from '@/hooks/useBadgeCount';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChatTypingBar } from './chat/ChatTypingBar';
import { VideoCallDialog } from './chat/VideoCallDialog';
import { ChatLayout } from './chat/ChatLayout';
import { ChatUserSearchDialog } from './ChatUserSearchDialog';
import { ChatHeader } from './chat/ChatHeader';
import { TickIndicator } from './chat/TickIndicator';
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
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');

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
  const markAllAsRead = useMarkAllConversationsRead();

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

  // Unread counts for all conversations
  const conversationIds = conversations?.map((c: any) => c.id).filter(Boolean) || [];

  const { data: allUnreadCounts = {} } = useQuery({
    queryKey: ['unread-counts-all', user?.id, conversationIds.join(',')],
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
  });

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
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
                {totalUnread > 0 && (
                  <p className="text-xs text-primary font-semibold">{totalUnread} unread</p>
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
                  <DropdownMenuItem onClick={() => {
                    markAllAsRead.mutate();
                  }}>
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
                  setIsVideoCall(false);
                  setShowCallDialog(true);
                }}
                onVideoCall={() => {
                  setIsVideoCall(true);
                  setShowCallDialog(true);
                }}
                onBlock={handleBlockToggle}
                onMute={(duration) => muteConversation.mutate(duration || 'always')}
                onClearChat={() => {
                  if (confirm('Clear all messages in this chat?')) {
                    clearMessages.mutate();
                  }
                }}
                isLoading={blockUser.isPending || unblockUser.isPending}
              />
            }
            messages={
              filteredMessages.length > 0 ? (
                <div className="space-y-2">
                  {filteredMessages.map((message: any, idx: number) => {
                    if (!message || message.deleted_for_all) return null;
                    const isOwn = message.sender_id === user?.id;
                    const showDateLabel = !isSearching && (idx === 0 || 
                      getMessageDateLabel(new Date(filteredMessages[idx - 1]?.created_at)) !== 
                      getMessageDateLabel(new Date(message.created_at)));
                    const metadata = message.metadata as { mediaUrl?: string; mediaType?: string } | null;
                    const tickStatus = getMessageTicks(message);

                    return (
                      <div key={message.id || idx}>
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
                              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100 rounded-tr-none" 
                              : "bg-card text-card-foreground rounded-tl-none"
                          )}>
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
                                    className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg hover:bg-secondary text-foreground"
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
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(message.created_at), 'HH:mm')}
                              </span>
                              {isOwn && (
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
                    sendMessage.mutate({ content, mediaUrl, mediaType });
                  }}
                  isSending={sendMessage.isPending}
                  onTyping={() => !isBlockedBy && handleUserTyping(user?.email?.split('@')[0] || 'User')}
                  onStopTyping={() => stopTyping(user?.email?.split('@')[0] || 'User')}
                />
              )
            }
            isLoading={messagesLoading}
            emptyState={
              <div className="text-center text-muted-foreground">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-10 h-10 text-primary" />
                </div>
                <p>No messages yet</p>
                <p className="text-sm mt-1">Say hello!</p>
              </div>
            }
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Sha-Verse Messenger</h3>
              <p className="max-w-sm text-muted-foreground">
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
        otherUser={otherUser || null}
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
          } catch (error) {
            toast.error('Failed to start conversation');
          }
        }}
      />
    </div>
  );
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
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-sm truncate">
            {otherUser?.display_name || 'Unknown User'}
          </h4>
          <div className="flex items-center gap-1">
            {isMuted && (
              <BellOff className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
            {convo.lastMessage && (
              <span className={cn(
                "text-[11px]",
                unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {formatDistanceToNow(new Date(convo.lastMessage.created_at), { addSuffix: false })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {convo.lastMessage?.sender_id === currentUserId && (
              <TickIndicator 
                status={convo.lastMessage?.is_read ? 'read' : convo.lastMessage?.is_delivered ? 'delivered' : 'sent'}
              />
            )}
            <p className="text-sm text-muted-foreground truncate">
              {isBlocked ? '🚫 Blocked' : (convo.lastMessage?.content || 'No messages yet')}
            </p>
          </div>
          {unreadCount > 0 && !isBlocked && (
            <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0 shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
