import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, Smile, Paperclip, Mic, Camera, Image as ImageIcon, 
  FileText, X, File
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { triggerImageCompression } from '@/lib/compressImage';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { compressForUpload } from '@/lib/media/compressFile';
import { uploadWithProgress } from '@/lib/media/uploadWithProgress';
import { useTheme } from 'next-themes';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Lazy-load emoji picker (heavy bundle) — only when user opens it
const EmojiPicker = lazy(() => import('emoji-picker-react'));
import { Theme as EmojiTheme } from 'emoji-picker-react';

interface ReplyPreview {
  id: string;
  senderName: string;
  content: string | null;
  isOwn?: boolean;
}

interface EditingPreview {
  id: string;
  content: string;
}

interface ChatTypingBarProps {
  onSendMessage: (content: string, mediaUrl?: string, mediaType?: string) => void;
  isSending?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
  /** WhatsApp-style "Replying to" preview chip above the input. */
  replyTo?: ReplyPreview | null;
  onCancelReply?: () => void;
  /** When set, the input is in edit mode for this message id. */
  editing?: EditingPreview | null;
  onCancelEdit?: () => void;
  /** Called when user submits an edit instead of a new message. */
  onSubmitEdit?: (newContent: string) => void;
}

export const ChatTypingBar = ({
  onSendMessage, isSending, onTyping, onStopTyping,
  replyTo, onCancelReply,
  editing, onCancelEdit, onSubmitEdit,
}: ChatTypingBarProps) => {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Background-upload state — upload starts the moment a file is picked,
  // so by the time the user hits Send the URL is usually already ready.
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; type: string } | null>(null);
  const uploadPromiseRef = useRef<Promise<{ url: string; type: string } | null> | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // WhatsApp-style: insert emoji at current cursor position
  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    const input = inputRef.current;
    const emoji = emojiData.emoji;

    if (input) {
      const start = input.selectionStart ?? message.length;
      const end = input.selectionEnd ?? message.length;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);

      // Restore focus + cursor position after emoji
      requestAnimationFrame(() => {
        input.focus();
        const newPos = start + emoji.length;
        input.setSelectionRange(newPos, newPos);
      });
    } else {
      setMessage((prev) => prev + emoji);
    }

    if (onTyping) onTyping();
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string } | null> => {
    if (!user) return null;

    try {
      const { path: fileName, publicUrl } = await uploadWithProgress({
        bucket: 'chat-media',
        file,
        userId: user.id,
        onProgress: (pct) => setUploadProgress(pct),
      });

      let type = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      // Background: only images get optimized WebP variants (fire-and-forget, silent)
      if (type === 'image') triggerImageCompression('chat-media', fileName);

      return { url: publicUrl, type };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      return null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Bigger ceiling for videos
    const isVideo = type === 'video' || file.type.startsWith('video/');
    const maxSize = isVideo ? 200 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${isVideo ? '200MB' : '50MB'}`);
      return;
    }

    setSelectedFile(file);
    setShowAttachMenu(false);
    setUploadedMedia(null);

    // Local preview for images
    if (type === 'image' || file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    // Kick off upload immediately in background — non-blocking.
    // For images: compress on a separate microtask so UI stays responsive.
    setIsUploading(true);
    setUploadProgress(0);
    const promise = (async () => {
      // Compress before upload (image + video). Safe no-op on failure.
      const toUpload = await compressForUpload(file, {
        onLargeFileWarning: () =>
          toast.info('Large video — compressing, this may take a moment…'),
      });
      return uploadFile(toUpload);
    })().then((result) => {
      setIsUploading(false);
      if (result) setUploadedMedia(result);
      return result;
    });
    uploadPromiseRef.current = promise;
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setUploadedMedia(null);
    uploadPromiseRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Prefill the input when entering edit mode (WhatsApp parity).
  useEffect(() => {
    if (editing) {
      setMessage(editing.content || '');
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        const len = (editing.content || '').length;
        inputRef.current?.setSelectionRange(len, len);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  const handleSend = async () => {
    if (editing) {
      const text = message.trim();
      if (!text) return;
      onSubmitEdit?.(text);
      setMessage('');
      onStopTyping?.();
      return;
    }

    if (!message.trim() && !selectedFile) return;

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (selectedFile) {
      // If background upload already finished, send instantly.
      // Otherwise await the in-flight upload (no double-upload).
      let result = uploadedMedia;
      if (!result && uploadPromiseRef.current) {
        result = await uploadPromiseRef.current;
      }

      if (result) {
        mediaUrl = result.url;
        mediaType = result.type;
      }
      clearSelectedFile();
    }

    onSendMessage(message.trim(), mediaUrl, mediaType);
    setMessage('');
    onStopTyping?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return null;
    if (selectedFile.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (selectedFile.type.startsWith('video/')) return <Camera className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div
      className="flex-shrink-0 bg-card border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Reply preview (WhatsApp parity) */}
      {replyTo && !editing && (
        <div className="px-3 pt-2">
          <div className="flex items-stretch gap-2 bg-secondary rounded-lg p-2 border-l-4 border-primary">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary truncate">
                Replying to {replyTo.isOwn ? 'yourself' : replyTo.senderName}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {replyTo.content || 'Media'}
              </p>
            </div>
            <Button
              variant="ghost" size="icon"
              className="rounded-full h-7 w-7 self-center flex-shrink-0"
              onClick={onCancelReply}
              aria-label="Cancel reply"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit mode preview */}
      {editing && (
        <div className="px-3 pt-2">
          <div className="flex items-stretch gap-2 bg-secondary rounded-lg p-2 border-l-4 border-amber-500">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 truncate">
                Editing message
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {editing.content || ''}
              </p>
            </div>
            <Button
              variant="ghost" size="icon"
              className="rounded-full h-7 w-7 self-center flex-shrink-0"
              onClick={() => { setMessage(''); onCancelEdit?.(); }}
              aria-label="Cancel edit"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="p-2 border-b border-border">
          <div className="flex items-center gap-2 bg-secondary rounded-lg p-2">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
            ) : (
              <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                {getFileIcon()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                {isUploading && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <span className="inline-block w-2.5 h-2.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Uploading…
                  </span>
                )}
                {!isUploading && uploadedMedia && (
                  <span className="text-green-600 dark:text-green-400">✓ Ready</span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={clearSelectedFile}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Typing Bar */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          {/* Emoji Button + Picker (WhatsApp-style) */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`rounded-full flex-shrink-0 h-10 w-10 transition-colors ${
                  showEmojiPicker 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Open emoji picker"
              >
                <Smile className="w-6 h-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="top" 
              align="start" 
              sideOffset={8}
              className="p-0 border-0 bg-transparent shadow-xl w-auto"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Suspense fallback={
                <div className="w-[320px] h-[400px] bg-card rounded-lg flex items-center justify-center border border-border">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  theme={(resolvedTheme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT)}
                  width={320}
                  height={400}
                  searchPlaceholder="Search emoji"
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled={false}
                  lazyLoadEmojis
                />
              </Suspense>
            </PopoverContent>
          </Popover>

          {/* Attachment Button with Popover */}
          <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full text-muted-foreground hover:text-foreground flex-shrink-0 h-10 w-10"
              >
                <Paperclip className="w-6 h-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" side="top" align="start">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                  <span>Photos</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <span>Videos</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <File className="w-4 h-4 text-white" />
                  </div>
                  <span>Document</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.zip,.rar"
            onChange={(e) => handleFileSelect(e, 'file')}
          />
          <input
            ref={imageInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'image')}
          />
          <input
            ref={videoInputRef}
            type="file"
            className="hidden"
            accept="video/*"
            onChange={(e) => handleFileSelect(e, 'video')}
          />

          {/* Message Input */}
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => {
              const nextMessage = e.target.value;
              setMessage(nextMessage);

              if (nextMessage.trim()) {
                onTyping?.();
              } else {
                onStopTyping?.();
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowEmojiPicker(false)}
            onBlur={() => onStopTyping?.()}
            placeholder="Type a message"
            className="flex-1 bg-secondary border-0 rounded-full px-4 h-11"
            disabled={isSending || isUploading}
          />

          {/* Send or Mic Button */}
          {message.trim() || selectedFile ? (
            <Button 
              size="icon" 
              className="rounded-full bg-primary hover:bg-primary/90 flex-shrink-0 h-11 w-11"
              onClick={handleSend}
              disabled={isSending || isUploading}
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-muted-foreground hover:text-foreground flex-shrink-0 h-10 w-10"
            >
              <Mic className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
