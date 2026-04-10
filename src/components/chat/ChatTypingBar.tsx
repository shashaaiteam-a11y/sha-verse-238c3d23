import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, Smile, Paperclip, Mic, Camera, Image as ImageIcon, 
  FileText, X, File
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ChatTypingBarProps {
  onSendMessage: (content: string, mediaUrl?: string, mediaType?: string) => void;
  isSending?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export const ChatTypingBar = ({ onSendMessage, isSending, onTyping, onStopTyping }: ChatTypingBarProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 50MB');
      return;
    }

    setSelectedFile(file);
    setShowAttachMenu(false);

    // Create preview for images
    if (type === 'image' || file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string } | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(fileName);

    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';

    return { url: publicUrl, type };
  };

  const handleSend = async () => {
    if (!message.trim() && !selectedFile) return;

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (selectedFile) {
      setIsUploading(true);
      const result = await uploadFile(selectedFile);
      setIsUploading(false);
      
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
    <div className="flex-shrink-0 bg-card border-t border-border">
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
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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
          {/* Emoji Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground flex-shrink-0 h-10 w-10"
          >
            <Smile className="w-6 h-6" />
          </Button>

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
