import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, X, SquarePen, Download, Printer, Image as ImageIcon, Globe } from 'lucide-react';
import { useNovaChat, Attachment, ChatMode } from '@/hooks/useNovaChat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ChatMessage from '@/components/novachat/ChatMessage';
import ChatSidebar from '@/components/novachat/ChatSidebar';
import WelcomeScreen from '@/components/novachat/WelcomeScreen';
import ChatInput from '@/components/novachat/ChatInput';
import { RewardedAdButton, BannerAd } from '@/components/ads';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import NovaChatInlineAd from '@/components/novachat/NovaChatInlineAd';
import NovaChatSettingsDialog from '@/components/novachat/NovaChatSettingsDialog';
import { downloadMarkdown, downloadAsHtml, printConversation } from '@/components/novachat/exportUtils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { speakText, stopSpeaking } from '@/components/novachat/useVoiceInput';



const NovaChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    conversations,
    conversationsLoading,
    currentConversationId,
    messages,
    isStreaming,
    settings,
    updateSettings,
    sendMessage,
    selectConversation,
    newChat,
    deleteConversation,
    updateTitle,
    toggleShare,
    stopGeneration
  } = useNovaChat();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('chat');



  const [input, setInput] = useState('');

  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [messageLimit, setMessageLimit] = useState(10); // Free tier: 10 messages

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);



  // Rewarded ad for +10 messages

  const { watchAd, isWatching } = useRewardedAd({

    rewardType: 'novachat_messages',

    placement: 'novachat_rewarded',

  });



  // Auto-scroll to bottom

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  }, [messages]);

  // Speak the latest assistant reply when voice is enabled and streaming has stopped
  useEffect(() => {
    if (!settings?.voice_enabled || isStreaming) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.content) {
      speakText(last.content);
    }
    return () => stopSpeaking();
  }, [isStreaming, settings?.voice_enabled, messages]);

  // Stop any ongoing TTS on unmount
  useEffect(() => () => stopSpeaking(), []);



  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    if (messageLimit <= 0) return;
    sendMessage(input, false, attachments, chatMode);
    setInput('');
    setAttachments([]);
    setChatMode('chat');
    setMessageLimit(prev => Math.max(0, prev - 1));
  };

  const currentConv = conversations?.find(c => c.id === currentConversationId);
  const handleShare = async () => {
    if (!currentConversationId) {
      toast({ title: 'Open a chat first', variant: 'destructive' });
      return;
    }
    if (currentConv?.share_token) {
      const url = `${window.location.origin}/novachat/share/${currentConv.share_token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Share link copied to clipboard' });
      return;
    }
    const token = await toggleShare.mutateAsync({ id: currentConversationId, enable: true });
    if (token) {
      const url = `${window.location.origin}/novachat/share/${token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: 'Share link created', description: 'Link copied to clipboard' });
    }
  };




  const handleReward = async () => {

    const success = await watchAd();

    if (success) {

      setMessageLimit(prev => prev + 10); // Add 10 messages

    }

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



          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" title="More">
                  <Download className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>This conversation</DropdownMenuLabel>
                <DropdownMenuItem disabled={!messages.length} onClick={() => downloadMarkdown(currentConv?.title || 'novachat', messages)}>
                  <Download className="w-4 h-4 mr-2" /> Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!messages.length} onClick={() => downloadAsHtml(currentConv?.title || 'novachat', messages)}>
                  <Download className="w-4 h-4 mr-2" /> Export as HTML
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!messages.length} onClick={() => printConversation(currentConv?.title || 'novachat', messages)}>
                  <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={newChat}>
              <SquarePen className="w-4 h-4" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </div>
        </header>






        {/* Messages Area */}

        <ScrollArea className="flex-1" ref={scrollAreaRef}>

          {messages.length === 0 ? (

            <WelcomeScreen onSuggestionClick={handleSuggestionClick} />

          ) : (

            <div className="pb-4">

              {(() => {
                let lastAdAt = -999;
                return messages.map((message, index) => {
                  // Inline ad every 6 messages (5–7 strategy), skip if streaming or too close to previous ad
                  const showInline =
                    (index + 1) % 6 === 0 &&
                    index !== messages.length - 1 &&
                    index - lastAdAt >= 5;

                  // After long AI response (>500 chars) — high CTR spot, only when not streaming
                  const isLongAiResponse =
                    message.role === 'assistant' &&
                    !isStreaming &&
                    message.content.length > 500 &&
                    index === messages.length - 1 &&
                    index - lastAdAt >= 3;

                  if (showInline || isLongAiResponse) lastAdAt = index;

                  return (
                    <div key={index}>
                      <ChatMessage
                        role={message.role}
                        content={message.content}
                        attachments={message.attachments}
                        isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                        onRegenerate={message.role === 'assistant' ? () => handleRegenerate(index) : undefined}
                        onEdit={message.role === 'user' ? handleEditMessage : undefined}
                        showActions={!isStreaming || index !== messages.length - 1}
                      />

                      {showInline && (
                        <NovaChatInlineAd
                          variant="inline"
                          contextText={message.content}
                        />
                      )}

                      {isLongAiResponse && (
                        <NovaChatInlineAd
                          variant="after_response"
                          contextText={message.content}
                        />
                      )}
                    </div>
                  );
                });
              })()}

              

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



        {/* Banner Ad above input */}

        <div className="px-4 py-2 border-y border-border bg-muted/30">

          <div className="max-w-3xl mx-auto flex justify-center">

            <BannerAd placement="novachat_banner" />

          </div>

        </div>



        {/* Message Limit Warning & Rewarded Ad */}

        {messageLimit <= 3 && messageLimit > 0 && (

          <div className="px-4 py-2 bg-yellow-500/10 border-y border-yellow-500/20">

            <p className="text-xs text-yellow-600 text-center">

              {messageLimit} free message{messageLimit !== 1 ? 's' : ''} remaining. Watch an ad to unlock 10 more!

            </p>

          </div>

        )}

        {messageLimit <= 0 && (

          <div className="px-4 py-3 bg-muted border-y border-border">

            <div className="flex items-center justify-between max-w-3xl mx-auto">

              <p className="text-sm text-muted-foreground">

                Message limit reached. Watch an ad to continue chatting.

              </p>

              <RewardedAdButton

                rewardType="novachat_messages"

                placement="novachat_rewarded"

                rewardLabel="+10 Messages"

                onRewardGranted={handleReward}

                size="sm"

              />

            </div>

          </div>

        )}



        {/* Input Area */}

        <ChatInput

          value={input}

          onChange={setInput}

          onSend={handleSend}

          onStop={stopGeneration}

          isStreaming={isStreaming}

          disabled={messageLimit <= 0}

          attachments={attachments}

          onAttachmentsChange={setAttachments}

          onNewChat={newChat}

          mode={chatMode}

          onModeChange={setChatMode}

        />

      </main>

    </div>

  );

};



export default NovaChat;

