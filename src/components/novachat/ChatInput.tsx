import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square, Paperclip, X, Plus, Mic, MicOff, Image as ImageIcon, Globe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Attachment, ChatMode } from '@/hooks/useNovaChat';
import { extractPdfText, extractTextFile } from './pdfExtract';
import { useVoiceInput } from './useVoiceInput';
import { useToast } from '@/components/ui/use-toast';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  attachments?: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  onNewChat?: () => void;
  mode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
}

const ChatInput = ({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  attachments = [],
  onAttachmentsChange,
  onNewChat,
  mode = 'chat',
  onModeChange,
}: ChatInputProps) => {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parsingRef = useRef(false);

  const { listening, supported: voiceSupported, start: startVoice, stop: stopVoice } = useVoiceInput({
    onTranscript: (text) => {
      onChange(value ? `${value} ${text}` : text);
    },
    onError: (msg) => toast({ title: 'Voice error', description: msg, variant: 'destructive' }),
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && (value.trim() || attachments.length > 0)) {
        onSend();
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    parsingRef.current = true;

    try {
      const newAttachments: Attachment[] = [];
      for (const file of files) {
        // Size guard 15 MB
        if (file.size > 15 * 1024 * 1024) {
          toast({ title: 'File too large', description: `${file.name} exceeds 15MB`, variant: 'destructive' });
          continue;
        }

        if (file.type === 'application/pdf') {
          // Extract text and inject as a context attachment
          try {
            const text = await extractPdfText(file);
            newAttachments.push({
              name: file.name,
              mimeType: 'text/plain',
              data: btoa(unescape(encodeURIComponent(`PDF "${file.name}" contents:\n\n${text}`))),
            });
            toast({ description: `Loaded ${file.name}` });
          } catch (err: any) {
            toast({ title: 'PDF parse failed', description: err?.message || 'Could not read PDF', variant: 'destructive' });
          }
        } else if (
          file.type === 'text/plain' ||
          file.type === 'text/markdown' ||
          file.type === 'text/csv' ||
          file.name.match(/\.(txt|md|csv|json)$/i)
        ) {
          try {
            const text = await extractTextFile(file);
            newAttachments.push({
              name: file.name,
              mimeType: 'text/plain',
              data: btoa(unescape(encodeURIComponent(`File "${file.name}" contents:\n\n${text}`))),
            });
            toast({ description: `Loaded ${file.name}` });
          } catch {
            toast({ title: 'Read failed', description: file.name, variant: 'destructive' });
          }
        } else {
          // Image or other binary: read as base64
          await new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const base64 = dataUrl.split(',')[1];
              newAttachments.push({ name: file.name, mimeType: file.type || 'application/octet-stream', data: base64 });
              resolve();
            };
            reader.onerror = () => reject(new Error('Read failed'));
            reader.readAsDataURL(file);
          });
        }
      }

      onAttachmentsChange?.([...attachments, ...newAttachments]);
    } finally {
      parsingRef.current = false;
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange?.(attachments.filter((_, i) => i !== index));
  };

  const canSend = (value.trim() || attachments.length > 0) && !disabled;

  const toggleMode = (target: ChatMode) => {
    onModeChange?.(mode === target ? 'chat' : target);
  };

  return (
    <div className="border-t border-border p-2 sm:p-3 pb-16 sm:pb-20 bg-background relative z-40">
      <div className="max-w-3xl mx-auto space-y-1.5 sm:space-y-2">
        {/* Mode banner */}
        {mode !== 'chat' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary">
            {mode === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
            <span className="font-medium">
              {mode === 'image' ? 'Image generation mode' : 'Web search mode'}
            </span>
            <button
              onClick={() => onModeChange?.('chat')}
              className="ml-auto opacity-70 hover:opacity-100"
              type="button"
              aria-label="Cancel mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {attachments.map((att, i) => (
              <div key={i} className="relative group">
                {att.mimeType.startsWith('image/') ? (
                  <img
                    src={`data:${att.mimeType};base64,${att.data}`}
                    alt={att.name}
                    className="h-16 w-16 object-cover rounded-lg border border-border"
                  />
                ) : (
                  <div className="h-16 w-32 flex items-center justify-center rounded-lg border border-border bg-secondary text-xs text-muted-foreground p-2 text-center break-all">
                    {att.name}
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className="relative flex items-end gap-1 sm:gap-2 bg-secondary/50 rounded-xl sm:rounded-2xl border border-border focus-within:border-primary/50 transition-colors">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.txt,.md,.csv,.json"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* New Chat Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl ml-0.5 sm:ml-1 mb-0.5 sm:mb-1 text-muted-foreground hover:text-foreground"
            disabled={isStreaming}
            onClick={onNewChat}
            type="button"
            title="New chat"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl mb-0.5 sm:mb-1 text-muted-foreground hover:text-foreground",
              attachments.length > 0 && "text-primary hover:text-primary"
            )}
            disabled={isStreaming}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            title="Attach image / PDF / text"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          {/* Image-gen mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl mb-0.5 sm:mb-1 text-muted-foreground hover:text-foreground",
              mode === 'image' && "text-primary bg-primary/10 hover:text-primary",
            )}
            disabled={isStreaming}
            onClick={() => toggleMode('image')}
            type="button"
            title="Generate an image"
          >
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? "Message limit reached — watch an ad to continue"
                : mode === 'image'
                ? "Describe the image you want to generate..."
                : mode === 'search'
                ? "Ask about anything happening on the web..."
                : "Message NovaChat..."
            }
            className={cn(
              "flex-1 min-h-[44px] sm:min-h-[52px] max-h-[150px] sm:max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2.5 sm:py-3.5 px-0 text-sm sm:text-base",
              disabled && "text-muted-foreground cursor-not-allowed"
            )}
            rows={1}
            disabled={disabled || isStreaming}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 sm:gap-1 mr-0.5 sm:mr-1 mb-0.5 sm:mb-1">
            {/* Voice mic */}
            {voiceSupported && (
              <Button
                variant="ghost"
                size="icon"
                disabled={isStreaming || disabled}
                onClick={listening ? stopVoice : startVoice}
                className={cn(
                  "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl",
                  listening
                    ? "text-destructive bg-destructive/10 hover:bg-destructive/20 animate-pulse"
                    : "text-muted-foreground hover:text-foreground",
                )}
                type="button"
                title={listening ? 'Stop listening' : 'Voice input'}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}

            {isStreaming ? (
              <Button
                onClick={onStop}
                size="icon"
                variant="ghost"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive"
              >
                <Square className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
              </Button>
            ) : (
              <Button
                onClick={onSend}
                disabled={!canSend}
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl transition-all",
                  canSend
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                <Send className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            )}
          </div>
        </div>


      </div>
    </div>
  );
};

export default ChatInput;
