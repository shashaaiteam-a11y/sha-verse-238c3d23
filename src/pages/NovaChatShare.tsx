import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ChatMessage from '@/components/novachat/ChatMessage';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft } from 'lucide-react';

interface SharedConv {
  id: string;
  title: string;
  created_at: string;
}
interface SharedMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const NovaChatShare = () => {
  const { token } = useParams<{ token: string }>();
  const [conv, setConv] = useState<SharedConv | null>(null);
  const [messages, setMessages] = useState<SharedMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error: rpcErr } = await supabase.rpc('get_shared_ai_conversation', { _token: token });
        if (rpcErr) throw rpcErr;
        const row: any = Array.isArray(data) ? data[0] : data;
        if (!row) {
          setError('Shared chat not found or no longer available.');
          setLoading(false);
          return;
        }
        setConv({ id: row.id, title: row.title, created_at: row.created_at });
        setMessages(((row.messages ?? []) as SharedMsg[]));
      } catch (e: any) {
        setError(e?.message ?? 'Could not load shared chat');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading shared chat…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4 px-4 text-center">
        <Sparkles className="w-10 h-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Chat unavailable</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <Button asChild variant="outline">
          <Link to="/novachat">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to NovaChat
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 bg-background/95 backdrop-blur sticky top-0 z-10">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link to="/novachat" aria-label="Back to NovaChat">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{conv?.title ?? 'Shared chat'}</h1>
          <p className="text-xs text-muted-foreground">Shared NovaChat conversation · read-only</p>
        </div>
        <Button asChild size="sm">
          <Link to="/novachat">Try NovaChat</Link>
        </Button>
      </header>

      <main className="flex-1">
        {messages.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">No messages in this chat.</div>
        ) : (
          <div className="pb-12">
            {messages.map((m, i) => (
              <ChatMessage
                key={m.id ?? i}
                role={m.role}
                content={m.content}
                showActions={false}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NovaChatShare;
