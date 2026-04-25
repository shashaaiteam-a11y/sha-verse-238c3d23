import { useNavigate } from 'react-router-dom';

interface HashtagTextProps {
  content: string;
  className?: string;
}

export const HashtagText = ({ content, className = '' }: HashtagTextProps) => {
  const navigate = useNavigate();

  // Parse content for hashtags
  const parseContent = (text: string) => {
    // Split by hashtag pattern but keep delimiters
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const hashtag = part.slice(1); // Remove the # symbol
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
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <span className={className}>
      {parseContent(content)}
    </span>
  );
};

