import { useNavigate } from 'react-router-dom';

interface HashtagTextProps {
  content: string;
  className?: string;
}

// Match URLs (http/https) OR hashtags
const TOKEN_REGEX = /(https?:\/\/[^\s]+)|(#[a-zA-Z0-9_]+)/g;

export const HashtagText = ({ content, className = '' }: HashtagTextProps) => {
  const navigate = useNavigate();

  // Known in-app route prefixes — links matching these always SPA-navigate,
  // even if the URL origin differs (e.g. shared from prod into preview).
  const INTERNAL_PATH_PREFIXES = [
    '/post/',
    '/group-post/',
    '/video/',
    '/bookshelf/book/',
    '/bookshelf/channel/',
    '/bookshelf/read/',
    '/bookshelf/edit/',
    '/channel/',
    '/groups/',
    '/pages/',
    '/profile/',
    '/novachat/share/',
  ];

  const isInternalPath = (pathname: string) =>
    INTERNAL_PATH_PREFIXES.some((p) => pathname.startsWith(p));

  const handleUrlClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const u = new URL(url);
      const sameOrigin =
        typeof window !== 'undefined' && u.origin === window.location.origin;
      if (sameOrigin || isInternalPath(u.pathname)) {
        // Internal link → SPA navigate (works across origins for known app routes)
        navigate(u.pathname + u.search + u.hash);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const parseContent = (text: string) => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    // Reset regex lastIndex per call
    const re = new RegExp(TOKEN_REGEX.source, 'g');

    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = re.lastIndex;
      if (start > lastIndex) {
        nodes.push(<span key={key++}>{text.slice(lastIndex, start)}</span>);
      }
      const url = match[1];
      const tag = match[2];
      if (url) {
        nodes.push(
          <a
            key={key++}
            href={url}
            onClick={(e) => handleUrlClick(e, url)}
            className="text-primary font-medium hover:underline break-all"
            rel="noopener noreferrer"
          >
            {url}
          </a>
        );
      } else if (tag) {
        const hashtag = tag.slice(1);
        nodes.push(
          <span
            key={key++}
            className="text-primary font-medium cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/explore?hashtag=${hashtag}`);
            }}
          >
            {tag}
          </span>
        );
      }
      lastIndex = end;
    }
    if (lastIndex < text.length) {
      nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }
    return nodes;
  };

  return <span className={className}>{parseContent(content)}</span>;
};
