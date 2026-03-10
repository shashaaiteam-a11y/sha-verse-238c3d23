import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { ChatDialog } from './ChatDialog';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

export const MessagesDrawer = () => {
  const { conversations, isLoading } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    otherUser: any;
  } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const handleSelectConversation = (convo: any) => {
    setSelectedConversation({
      id: convo.id,
      otherUser: convo.otherMembers?.[0] || null
    });
    setChatOpen(true);
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <MessageCircle className="w-5 h-5" />
            {conversations && conversations.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {conversations.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[350px] sm:w-[400px] p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle>Messages</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-80px)]">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="divide-y divide-border">
                {conversations.map((convo: any) => {
                  const otherUser = convo.otherMembers?.[0];
                  return (
                    <button
                      key={convo.id}
                      onClick={() => handleSelectConversation(convo)}
                      className="w-full p-4 hover:bg-secondary/50 transition-colors text-left flex items-start gap-3"
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        {otherUser?.avatar_url && <AvatarImage src={otherUser.avatar_url} />}
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                          {otherUser?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-sm truncate">
                            {otherUser?.display_name || 'Unknown User'}
                          </h4>
                          {convo.lastMessage && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(convo.lastMessage.created_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {convo.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {convo.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start a chat from a friend's profile
                </p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        conversationId={selectedConversation?.id || null}
        otherUser={selectedConversation?.otherUser || null}
      />
    </>
  );
};
