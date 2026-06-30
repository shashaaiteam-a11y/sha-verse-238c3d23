import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ChatLayout } from './chat/ChatLayout';
import { cn } from '@/lib/utils';

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  otherUser: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  } | null;
}

export const ChatDialog = ({ open, onOpenChange, conversationId, otherUser }: ChatDialogProps) => {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage } = useMessages(conversationId);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate({ content: newMessage.trim() });
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0 overflow-hidden">
        <ChatLayout
          bottomAnchorKey={conversationId}
          header={
            <DialogHeader className="p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {otherUser?.avatar_url && <AvatarImage src={otherUser.avatar_url} />}
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {otherUser?.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-base font-semibold">
                    {otherUser?.display_name || 'Chat'}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">@{otherUser?.username}</p>
                </div>
              </div>
            </DialogHeader>
          }
          messages={
            messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message: any) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                    >
                      <div className={cn("flex gap-2 max-w-[80%]", isOwn && "flex-row-reverse")}>
                        {!isOwn && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            {message.profiles?.avatar_url && (
                              <AvatarImage src={message.profiles.avatar_url} />
                            )}
                            <AvatarFallback className="bg-gradient-secondary text-secondary-foreground text-xs">
                              {message.profiles?.display_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2",
                            isOwn
                              ? "bg-gradient-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={cn(
                            "text-[10px] mt-1",
                            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null
          }
          inputBar={
            <div className="p-4 border-t border-border flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={sendMessage.isPending}
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!newMessage.trim() || sendMessage.isPending}
                  className="bg-gradient-primary"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          }
          isLoading={isLoading}
          emptyState={
            <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
          }
        />
      </DialogContent>
    </Dialog>
  );
};
