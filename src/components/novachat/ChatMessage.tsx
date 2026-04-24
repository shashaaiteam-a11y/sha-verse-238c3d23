import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  User, Bot, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown,
  MoreHorizontal, Pencil, Paperclip
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Attachment } from '@/hooks/useNovaChat';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
  showActions?: boolean;
}

const ChatMessage = ({ 
  role, 
  content, 
  attachments,
  isStreaming = false, 
  onRegenerate,
  onEdit,
  showActions = true 
}: ChatMessageProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ description: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const CodeBlock = ({ language, children }: { language: string; children: string }) => {
    const [codeCopied, setCodeCopied] = useState(false);

    const copyCode = async () => {
      await navigator.clipboard.writeText(children);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    };

    return (
      <div className="relative group my-4">
        <div className="flex items-center justify-between bg-secondary/80 px-4 py-2 rounded-t-lg border-b border-border">
          <span className="text-xs text-muted-foreground font-mono">{language || 'code'}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={copyCode}
          >
            {codeCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {codeCopied ? 'Copied!' : 'Copy code'}
          </Button>
        </div>
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="!mt-0 !rounded-t-none !rounded-b-lg"
          customStyle={{ margin: 0 }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    );
  };

  return (
    <div className={cn(
      "group py-6 px-4 sm:px-6",
      role === 'assistant' ? 'bg-secondary/30' : 'bg-transparent'
    )}>
      <div className="max-w-3xl mx-auto flex gap-4">
        <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
          <AvatarFallback className={cn(
            role === 'user' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
          )}>
            {role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {role === 'user' ? 'You' : 'NovaChat'}
            </span>
            {isStreaming && role === 'assistant' && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                <Pencil className="w-3.5 h-3.5 text-emerald-500 animate-bounce" style={{ animationDuration: '0.8s' }} />
                <span>Writing...</span>
              </span>
            )}
          </div>
          
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
            {/* Attachment images */}
            {attachments && attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 not-prose">
                {attachments.map((att, i) =>
                  att.mimeType.startsWith('image/') ? (
                    <img
                      key={i}
                      src={`data:${att.mimeType};base64,${att.data}`}
                      alt={att.name}
                      className="max-h-48 max-w-xs rounded-lg border border-border object-contain"
                    />
                  ) : (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary text-xs text-muted-foreground">
                      <Paperclip className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[160px]">{att.name}</span>
                    </div>
                  )
                )}
              </div>
            )}
            <ReactMarkdown
              urlTransform={(url) => url}
              components={{
                img({ src, alt }) {
                  if (!src) return null;
                  return (
                    <img
                      src={src}
                      alt={alt || 'Generated image'}
                      className="rounded-lg border border-border max-w-full h-auto my-3"
                      loading="lazy"
                    />
                  );
                },
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  
                  if (match) {
                    return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
                  }
                  
                  return (
                    <code className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="mb-3 last:mb-0">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="mb-3 space-y-1 list-disc pl-4">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="mb-3 space-y-1 list-decimal pl-4">{children}</ol>;
                },
                li({ children }) {
                  return <li className="leading-relaxed">{children}</li>;
                },
                h1({ children }) {
                  return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-lg font-bold mt-4 mb-2">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-base font-bold mt-3 mb-2">{children}</h3>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-3">
                      {children}
                    </blockquote>
                  );
                },
                a({ href, children }) {
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {children}
                    </a>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border border-border rounded-lg">{children}</table>
                    </div>
                  );
                },
                th({ children }) {
                  return <th className="bg-secondary px-4 py-2 text-left font-semibold border-b border-border">{children}</th>;
                },
                td({ children }) {
                  return <td className="px-4 py-2 border-b border-border">{children}</td>;
                }
              }}
            >
              {content || ''}
            </ReactMarkdown>
            
            {isStreaming && !content && (
              <span className="inline-block w-2 h-5 bg-foreground/50 animate-pulse" />
            )}
          </div>
          
          {/* Actions */}
          {showActions && !isStreaming && content && (
            <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => copyToClipboard(content)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              
              {role === 'assistant' && onRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={onRegenerate}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              
              {role === 'assistant' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 px-2", feedback === 'up' && "text-primary")}
                    onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 px-2", feedback === 'down' && "text-destructive")}
                    onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              {role === 'user' && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => onEdit(content)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
