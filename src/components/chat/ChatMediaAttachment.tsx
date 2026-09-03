import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { getChatMediaUrl } from '@/lib/chat/chatMediaUrl';

interface ChatMediaAttachmentProps {
  mediaUrl: string;
  mediaType?: string;
  /** When true, clicks are swallowed (selection mode in the chat list). */
  disableOpen?: boolean;
}

/**
 * Renders a chat attachment using a signed URL, since the `chat-media`
 * bucket is private. Purely a presentation wrapper — no messaging logic.
 */
const ChatMediaAttachment = ({ mediaUrl, mediaType, disableOpen }: ChatMediaAttachmentProps) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setResolvedUrl(null);
    getChatMediaUrl(mediaUrl).then((url) => {
      if (active) setResolvedUrl(url);
    });
    return () => {
      active = false;
    };
  }, [mediaUrl]);

  const openInNewTab = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disableOpen) return;
    const url = resolvedUrl ?? (await getChatMediaUrl(mediaUrl));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (mediaType === 'image') {
    return resolvedUrl ? (
      <img
        src={resolvedUrl}
        alt="Shared image"
        loading="lazy"
        decoding="async"
        className="rounded-lg max-w-full cursor-pointer hover:opacity-90"
        onClick={openInNewTab}
      />
    ) : (
      <div className="h-40 w-40 max-w-full rounded-lg bg-muted animate-pulse" />
    );
  }

  if (mediaType === 'video') {
    return resolvedUrl ? (
      <video src={resolvedUrl} controls preload="none" playsInline className="rounded-lg max-w-full" />
    ) : (
      <div className="h-40 w-56 max-w-full rounded-lg bg-muted animate-pulse" />
    );
  }

  return (
    <a
      href={resolvedUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={openInNewTab}
      className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg hover:bg-secondary text-foreground"
    >
      <FileText className="w-8 h-8 text-primary" />
      <span className="text-sm underline">Download File</span>
    </a>
  );
};

export default ChatMediaAttachment;
