import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64 (no data: prefix)
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  share_token?: string | null;
  shared_at?: string | null;
  model_override?: string | null;
}

export interface NovaSettings {
  preferred_model: string;
  custom_system_prompt: string | null;
  memory_facts: string | null;
  voice_enabled: boolean;
  show_reasoning: boolean;
}

export type ChatMode = 'chat' | 'image' | 'search';

export const AVAILABLE_MODELS = [
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: 'Fast • Free tier' },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', tag: 'Fastest • Cheapest' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', tag: 'Best reasoning' },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)', tag: 'New • Fast' },
  { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini', tag: 'Balanced' },
  { id: 'openai/gpt-5', label: 'GPT-5', tag: 'Most capable' },
] as const;

const DEFAULT_SETTINGS: NovaSettings = {
  preferred_model: 'google/gemini-2.5-flash',
  custom_system_prompt: null,
  memory_facts: null,
  voice_enabled: false,
  show_reasoning: false,
};

export const useNovaChat = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ---------- Settings ----------
  const { data: settings } = useQuery({
    queryKey: ['novachat-settings', user?.id],
    queryFn: async (): Promise<NovaSettings> => {
      if (!user) return DEFAULT_SETTINGS;
      const { data, error } = await (supabase as any)
        .from('novachat_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        console.error('Settings load error', error);
        return DEFAULT_SETTINGS;
      }
      return data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS;
    },
    enabled: !!user,
  });

  const updateSettings = useMutation({
    mutationFn: async (patch: Partial<NovaSettings>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('novachat_settings')
        .upsert({ user_id: user.id, ...settings, ...patch }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novachat-settings', user?.id] });
      toast({ description: 'Settings saved' });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  // ---------- Cache helper ----------
  const mergeConversationIntoCache = useCallback((conv: Partial<Conversation> & { id: string }) => {
    if (!user?.id) return;
    queryClient.setQueryData<Conversation[]>(['ai-conversations', user.id], (old) => {
      const prev = old ?? [];
      const existing = prev.find((c) => c.id === conv.id);
      const merged = existing ? { ...existing, ...conv } : {
        id: conv.id,
        title: conv.title ?? 'New Chat',
        is_archived: conv.is_archived ?? false,
        created_at: conv.created_at ?? new Date().toISOString(),
        updated_at: conv.updated_at ?? new Date().toISOString(),
      } as Conversation;
      const filtered = prev.filter((c) => c.id !== conv.id);
      return [merged, ...filtered];
    });
  }, [queryClient, user?.id]);

  // ---------- Conversations list ----------
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['ai-conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!user,
  });

  // ---------- Messages for current conversation ----------
  const { isLoading: messagesLoading } = useQuery({
    queryKey: ['ai-messages', currentConversationId],
    queryFn: async () => {
      if (!currentConversationId) return [];
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const msgs = data.map((m: any) => ({ id: m.id, role: m.role, content: m.content }));
      setMessages(msgs);
      return msgs;
    },
    enabled: !!currentConversationId,
  });

  // ---------- Mutations ----------
  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('ai_messages').delete().eq('conversation_id', id);
      const { error } = await supabase.from('ai_conversations').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: (id) => {
      const prev = queryClient.getQueryData<Conversation[]>(['ai-conversations', user?.id]);
      queryClient.setQueryData<Conversation[]>(['ai-conversations', user?.id], (o) => (o ?? []).filter(c => c.id !== id));
      if (currentConversationId === id) { setCurrentConversationId(null); setMessages([]); }
      return { prev };
    },
    onError: (_e, _id, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(['ai-conversations', user?.id], ctx.prev);
      toast({ title: 'Delete failed', variant: 'destructive' });
    },
    onSuccess: (_d, id) => {
      queryClient.removeQueries({ queryKey: ['ai-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['ai-conversations', user?.id] });
    },
  });

  const updateTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from('ai_conversations')
        .update({ title, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      mergeConversationIntoCache({ id: v.id, title: v.title });
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });

  const archiveConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_conversations').update({ is_archived: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (currentConversationId === id) { setCurrentConversationId(null); setMessages([]); }
    },
  });

  // ---------- Sharing ----------
  const toggleShare = useMutation({
    mutationFn: async ({ id, enable }: { id: string; enable: boolean }) => {
      if (enable) {
        const token = crypto.randomUUID().replace(/-/g, '');
        const { error } = await supabase.from('ai_conversations')
          .update({ share_token: token, shared_at: new Date().toISOString() } as any)
          .eq('id', id);
        if (error) throw error;
        return token;
      } else {
        const { error } = await supabase.from('ai_conversations')
          .update({ share_token: null, shared_at: null } as any).eq('id', id);
        if (error) throw error;
        return null;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-conversations'] }),
  });

  // ---------- DB save helper ----------
  const saveMessage = async (conversationId: string, role: string, content: string) => {
    const { error } = await supabase.from('ai_messages').insert({ conversation_id: conversationId, role, content });
    if (error) console.error('Save message failed:', error);
  };

  const generateTitle = (content: string): string => {
    const words = content.split(' ').slice(0, 6).join(' ');
    return words.length > 40 ? words.substring(0, 40) + '...' : words || 'New Chat';
  };

  // ---------- Stop generation ----------
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  // ---------- Send message (streaming via edge function) ----------
  const sendMessage = useCallback(async (
    input: string,
    isRegenerate: boolean = false,
    attachments?: Attachment[],
    mode: ChatMode = 'chat',
  ) => {
    if (!user || (!input.trim() && (!attachments || attachments.length === 0))) return;

    let conversationId = currentConversationId;
    if (!conversationId) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, title: generateTitle(input) })
        .select().single();
      if (error) {
        toast({ title: 'Error', description: 'Failed to create chat', variant: 'destructive' });
        return;
      }
      conversationId = data.id;
      setCurrentConversationId(conversationId);
      mergeConversationIntoCache(data as any);
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    }

    let newMessages: Message[];
    if (isRegenerate) {
      let lastUserIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') { lastUserIdx = i; break; }
      }
      newMessages = messages.slice(0, lastUserIdx + 1);
    } else {
      newMessages = [...messages, { role: 'user', content: input, attachments }];
      await saveMessage(conversationId, 'user', input);
    }
    setMessages(newMessages);
    setIsStreaming(true);

    let assistantContent = '';
    abortControllerRef.current = new AbortController();

    try {
      // Build OpenAI-style messages with multimodal content for vision
      const apiMessages = newMessages.map((m) => {
        if (m.attachments && m.attachments.length > 0) {
          const parts: any[] = [];
          if (m.content) parts.push({ type: 'text', text: m.content });
          for (const att of m.attachments) {
            if (att.mimeType.startsWith('image/')) {
              parts.push({ type: 'image_url', image_url: { url: `data:${att.mimeType};base64,${att.data}` } });
            } else {
              // Non-image: include as text reference
              parts.push({ type: 'text', text: `\n[Attached file: ${att.name}]` });
            }
          }
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: m.content };
      });

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/novachat-ai`;
      const accessToken = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: settings?.preferred_model,
          systemPrompt: settings?.custom_system_prompt,
          memoryFacts: settings?.memory_facts,
          mode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || 'AI request failed');
      }
      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              assistantContent += token;
              setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      if (assistantContent) {
        await saveMessage(conversationId, 'assistant', assistantContent);
        await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        if (assistantContent) await saveMessage(conversationId!, 'assistant', assistantContent);
        return;
      }
      console.error('Stream error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to get response',
        variant: 'destructive',
      });
      setMessages(newMessages);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [user, session, currentConversationId, messages, toast, queryClient, settings, mergeConversationIntoCache]);

  const selectConversation = useCallback((id: string) => setCurrentConversationId(id), []);
  const newChat = useCallback(() => { setCurrentConversationId(null); setMessages([]); }, []);

  return {
    conversations,
    conversationsLoading,
    currentConversationId,
    messages,
    messagesLoading,
    isStreaming,
    settings: settings ?? DEFAULT_SETTINGS,
    updateSettings,
    sendMessage,
    selectConversation,
    newChat,
    deleteConversation,
    updateTitle,
    archiveConversation,
    toggleShare,
    stopGeneration,
  };
};
