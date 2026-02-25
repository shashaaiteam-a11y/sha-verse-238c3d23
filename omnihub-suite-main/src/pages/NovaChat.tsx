import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, X, SquarePen } from 'lucide-react';
import { useNovaChat, Attachment } from '@/hooks/useNovaChat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ChatMessage from '@/components/novachat/ChatMessage';
import ChatSidebar from '@/components/novachat/ChatSidebar';
import WelcomeScreen from '@/components/novachat/WelcomeScreen';
import ChatInput from '@/components/novachat/ChatInput';

const NovaChat = () => {
  const { user } = useAuth();
  const {
    conversations,
    conversationsLoading,
    currentConversationId,
    messages,
    isStreaming,
    sendMessage,
    selectConversation,
    newChat,
    deleteConversation,
    updateTitle,
    stopGeneration
  } = useNovaChat();

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    sendMessage(input, false, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleRegenerate = (index: number) => {
    // Find the last user message before this assistant message
    const slice = messages.slice(0, index);
    let userMessageIndex = -1;
    for (let i = slice.length - 1; i >= 0; i--) {
      if (slice[i].role === 'user') {
        userMessageIndex = i;
        break;
      }
    }
    if (userMessageIndex !== -1) {
      const userMessage = messages[userMessageIndex];
      sendMessage(userMessage.content, true);
    }
  };

  const handleEditMessage = (content: string) => {
    setInput(content);
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:relative z-50 h-full transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full lg:w-0"
        )}
      >
        {sidebarOpen && (
          <ChatSidebar
            conversations={conversations}
            isLoading={conversationsLoading}
            currentConversationId={currentConversationId}
            user={user}
            onNewChat={newChat}
            onSelectConversation={selectConversation}
            onDeleteConversation={(id) => deleteConversation.mutate(id)}
            onRenameConversation={(id, title) => updateTitle.mutate({ id, title })}
          />
        )}
      </aside>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 flex-shrink-0 bg-black" style={{ borderRadius: '0.5rem', overflow: 'hidden', clipPath: 'inset(0 round 0.5rem)', transform: 'translateZ(0)' }}>
              <video
                src="/novachat-logo.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-semibold text-sm">NovaChat</h1>
              <p className="text-xs text-muted-foreground">Powered by AI</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="gap-1.5 text-xs flex-shrink-0" onClick={newChat}>
            <SquarePen className="w-4 h-4" />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="pb-4">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  attachments={message.attachments}
                  isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                  onRegenerate={message.role === 'assistant' ? () => handleRegenerate(index) : undefined}
                  onEdit={message.role === 'user' ? handleEditMessage : undefined}
                  showActions={!isStreaming || index !== messages.length - 1}
                />
              ))}
              
              {/* Streaming placeholder */}
              {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                <ChatMessage
                  role="assistant"
                  content=""
                  isStreaming={true}
                  showActions={false}
                />
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={stopGeneration}
          isStreaming={isStreaming}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          onNewChat={newChat}
        />
      </main>
    </div>
  );
};

export default NovaChat;
