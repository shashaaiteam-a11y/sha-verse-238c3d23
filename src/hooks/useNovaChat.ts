import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64
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
}

export const useNovaChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const mergeConversationIntoCache = useCallback((conversation: Partial<Conversation> & { id: string }) => {
    if (!user?.id) return;
    queryClient.setQueryData<Conversation[]>(['ai-conversations', user.id], (old) => {
      const previous = old ?? [];
      const existing = previous.find((conv) => conv.id === conversation.id);
      const merged = existing
        ? { ...existing, ...conversation }
        : {
            id: conversation.id,
            title: conversation.title ?? 'New Chat',
            is_archived: conversation.is_archived ?? false,
            created_at: conversation.created_at ?? new Date().toISOString(),
            updated_at: conversation.updated_at ?? conversation.created_at ?? new Date().toISOString()
          };
      const filtered = previous.filter((conv) => conv.id !== conversation.id);
      return [merged, ...filtered];
    });
  }, [queryClient, user?.id]);

  // Fetch all conversations
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
    enabled: !!user
  });

  // Fetch messages for current conversation
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
    enabled: !!currentConversationId
  });

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: async (title: string = 'New Chat') => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      mergeConversationIntoCache({
        id: data.id,
        title: data.title,
        is_archived: data.is_archived,
        created_at: data.created_at,
        updated_at: data.updated_at
      });
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      setCurrentConversationId(data.id);
      setMessages([]);
    }
  });

  // Delete conversation
  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      // Try to delete messages first (may fail if cascade is set up - that's ok)
      await supabase
        .from('ai_messages')
        .delete()
        .eq('conversation_id', conversationId);

      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId);
      if (error) throw error;
    },
    onMutate: (conversationId) => {
      // Snapshot for rollback
      const previousConversations = queryClient.getQueryData<Conversation[]>(['ai-conversations', user?.id]);
      // Optimistically remove from UI immediately
      queryClient.setQueryData<Conversation[]>(['ai-conversations', user?.id], (old) => {
        return (old ?? []).filter((conv) => conv.id !== conversationId);
      });
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      return { previousConversations };
    },
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: ['ai-messages', deletedId] });
      queryClient.invalidateQueries({ queryKey: ['ai-conversations', user?.id] });
    },
    onError: (err, _conversationId, context: any) => {
      // Rollback on error
      if (context?.previousConversations) {
        queryClient.setQueryData(['ai-conversations', user?.id], context.previousConversations);
      }
      toast({ title: 'Error', description: 'Failed to delete conversation', variant: 'destructive' });
    }
  });

  // Update conversation title
  const updateTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      mergeConversationIntoCache({ id: variables.id, title: variables.title });
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    }
  });

  // Archive conversation
  const archiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ is_archived: true })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: (_, archivedId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      if (currentConversationId === archivedId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    }
  });

  // Save message to database
  const saveMessage = async (conversationId: string, role: string, content: string) => {
    const { error } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: conversationId, role, content });
    if (error) console.error('Failed to save message:', error);
  };

  // Generate title from first message
  const generateTitle = (content: string): string => {
    const words = content.split(' ').slice(0, 6).join(' ');
    return words.length > 40 ? words.substring(0, 40) + '...' : words;
  };

  // Stop generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  // Stream chat
  const sendMessage = useCallback(async (input: string, isRegenerate: boolean = false, attachments?: Attachment[]) => {
    if (!user || (!input.trim() && (!attachments || attachments.length === 0))) return;

    let conversationId = currentConversationId;

    // Create new conversation if needed
    if (!conversationId) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, title: generateTitle(input) })
        .select()
        .single();
      if (error) {
        toast({ title: 'Error', description: 'Failed to create conversation', variant: 'destructive' });
        return;
      }
      conversationId = data.id;
      setCurrentConversationId(conversationId);
      mergeConversationIntoCache({
        id: data.id,
        title: data.title,
        is_archived: data.is_archived,
        created_at: data.created_at,
        updated_at: data.updated_at
      });
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    }

    let newMessages: Message[];

    if (isRegenerate) {
      let lastUserIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserIndex = i;
          break;
        }
      }
      newMessages = messages.slice(0, lastUserIndex + 1);
    } else {
      const userMessage: Message = { role: 'user', content: input, attachments };
      newMessages = [...messages, userMessage];
      await saveMessage(conversationId, 'user', input);
    }

    setMessages(newMessages);
    setIsStreaming(true);
    let assistantContent = '';

    abortControllerRef.current = new AbortController();

    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
      }

      // Convert messages to Gemini format (role: user/model, parts with optional inlineData)
      const geminiContents = newMessages.map(m => {
        const parts: any[] = [];
        // Add image attachments as inlineData
        if (m.attachments && m.attachments.length > 0) {
          for (const att of m.attachments) {
            parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
          }
        }
        parts.push({ text: m.content || ' ' });
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });

      const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite-001', 'gemini-flash-latest'];
      let response: Response | null = null;

      for (let attempt = 0; attempt < models.length; attempt++) {
        const model = models[attempt];
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{
                  text: `You are NovaChat, a helpful, harmless, and honest AI assistant. You provide clear, accurate, and helpful responses to user queries.

Key behaviors:
- Be conversational and friendly
- Provide detailed explanations when needed
- Use markdown formatting for code, lists, and emphasis
- If you don't know something, say so honestly
- Help with coding, writing, analysis, math, and general questions`
                }]
              },
              contents: geminiContents,
              generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              }
            }),
            signal: abortControllerRef.current.signal
          }
        );

        if ((response.status === 429 || response.status === 404) && attempt < models.length - 1) {
          // wait 2s then try next model
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        break;
      }

      if (!response!.ok) {
        const errorData = await response!.json().catch(() => ({}));
        if (response!.status === 429) throw new Error('Gemini API rate limit exceeded. Free tier allows 15 requests/minute. Please wait 1 minute and try again.');
        if (response!.status === 404) throw new Error('Gemini model not available. Please try again.');
        if (response!.status === 400) throw new Error(errorData.error?.message || 'Invalid request');
        throw new Error(errorData.error?.message || `Request failed with status ${response!.status}`);
      }

      if (!response!.body) throw new Error('No response body');

      const reader = response!.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
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
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              assistantContent += text;
              setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
            }
          } catch {
            // skip malformed chunk
          }
        }
      }

      if (assistantContent) {
        await saveMessage(conversationId, 'assistant', assistantContent);
        await supabase
          .from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (assistantContent) {
          await saveMessage(conversationId!, 'assistant', assistantContent);
        }
        return;
      }

      console.error('Stream error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get response',
        variant: 'destructive'
      });
      setMessages(newMessages);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [user, currentConversationId, messages, toast, queryClient]);

  const selectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
  }, []);

  const newChat = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  return {
    conversations,
    conversationsLoading,
    currentConversationId,
    messages,
    messagesLoading,
    isStreaming,
    sendMessage,
    selectConversation,
    newChat,
    createConversation,
    deleteConversation,
    updateTitle,
    archiveConversation,
    stopGeneration
  };
};
