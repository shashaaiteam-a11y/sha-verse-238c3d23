import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square, Paperclip, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Attachment } from '@/hooks/useNovaChat';

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
  onNewChat
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const newAttachments: Attachment[] = await Promise.all(
      files.map(file => new Promise<Attachment>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          // dataUrl is "data:<mimeType>;base64,<data>" — extract base64 only
          const base64 = dataUrl.split(',')[1];
          resolve({ name: file.name, mimeType: file.type, data: base64 });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }))
    );

    onAttachmentsChange?.([...attachments, ...newAttachments]);
    // reset file input so same file can be re-selected
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange?.(attachments.filter((_, i) => i !== index));
  };

  const canSend = (value.trim() || attachments.length > 0) && !disabled;

  return (
    <div className="border-t border-border p-2 sm:p-3 pb-16 sm:pb-20 bg-background relative z-50">
      <div className="max-w-3xl mx-auto space-y-1.5 sm:space-y-2">

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
            accept="image/*,application/pdf,.txt,.md,.csv"
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
              "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl ml-0.5 sm:ml-1 mb-0.5 sm:mb-1 text-muted-foreground hover:text-foreground",
              attachments.length > 0 && "text-primary hover:text-primary"
            )}
            disabled={isStreaming}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message NovaChat..."
            className="flex-1 min-h-[44px] sm:min-h-[52px] max-h-[150px] sm:max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2.5 sm:py-3.5 px-0 text-sm sm:text-base"
            rows={1}
            disabled={disabled || isStreaming}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5 sm:gap-1 mr-0.5 sm:mr-1 mb-0.5 sm:mb-1">
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
