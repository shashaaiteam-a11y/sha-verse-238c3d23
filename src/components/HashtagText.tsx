import { useNavigate } from 'react-router-dom';
import { Fragment } from 'react';

interface HashtagTextProps {
  content: string;
  className?: string;
  onNavigate?: () => void;
}

// Match #hashtag OR full http(s) URL
const TOKEN_REGEX = /(#[a-zA-Z0-9_]+|https?:\/\/[^\s]+)/g;

export const HashtagText = ({ content, className = '', onNavigate }: HashtagTextProps) => {
  const navigate = useNavigate();

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();

    // If the URL points to the same origin → internal SPA navigation
    try {
      const parsed = new URL(url);
      if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
        e.preventDefault();
        navigate(`${parsed.pathname}${parsed.search}${parsed.hash}`);
        onNavigate?.();
        return;
      }
    } catch {
      /* invalid URL — fall through to default */
    }
    // External link → let the browser open it (target=_blank)
  };

  const parts = content.split(TOKEN_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Hashtag
        if (part.startsWith('#') && /^#[a-zA-Z0-9_]+$/.test(part)) {
          const hashtag = part.slice(1);
          return (
            <span
              key={index}
              className="text-primary font-medium cursor-pointer hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/explore?hashtag=${hashtag}`);
              }}
            >
              {part}
            </span>
          );
        }

        // URL
        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleLinkClick(e, part)}
              className="text-primary font-medium hover:underline break-all"
            >
              {part}
            </a>
          );
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}
    </span>
  );
};
