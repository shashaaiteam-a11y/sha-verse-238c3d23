

## Plan: Upgrade NovaChat to ChatGPT-level AI Assistant

### Problem
NovaChat currently calls the Gemini API directly from the frontend using `VITE_GEMINI_API_KEY`. It needs to be upgraded to:
1. Use Lovable AI Gateway (proper backend architecture, no exposed API keys)
2. Have a friendly, emoji-rich personality that explains everything about the universe
3. Support image generation through simple prompts
4. Maintain streaming responses with typing effect

### Changes

#### 1. Create Edge Function: `supabase/functions/novachat/index.ts`
- Backend function that proxies requests to Lovable AI Gateway
- Uses `LOVABLE_API_KEY` (already available)
- Supports two modes:
  - **Chat mode**: Streams text responses via SSE using `google/gemini-3-flash-preview`
  - **Image mode**: Generates images using `google/gemini-3.1-flash-image-preview` when user asks for image generation
- Rich system prompt: friendly, emoji-heavy, explains everything in the universe, Hinglish-friendly tone
- Handles 429/402 errors properly

#### 2. Update `src/hooks/useNovaChat.ts`
- Remove direct Gemini API calls and `VITE_GEMINI_API_KEY` usage
- Route all requests through the new edge function (`/functions/v1/novachat`)
- Add image generation detection: if user prompt starts with "generate image", "draw", "create image", etc., call the edge function in image mode
- Parse image responses (base64) and display inline in chat
- Keep existing streaming SSE parsing for text responses
- Keep all existing conversation/message management unchanged

#### 3. Update `src/components/novachat/ChatMessage.tsx`
- Add support for rendering generated images in assistant messages (detect base64 image data or image URLs in content)
- Keep all existing markdown rendering unchanged

#### 4. Update System Prompt (in edge function)
```
You are NovaChat 🌟 — a friendly, knowledgeable AI assistant who knows everything about the universe!

Key behaviors:
- Use emojis naturally throughout responses 🎯✨🔥
- Explain things in a friendly, conversational style — like a smart dost (friend)
- Support Hinglish naturally when users write in it
- Give detailed explanations with proper formatting
- Use markdown: headers, lists, code blocks, tables, bold, etc.
- If someone asks to generate/draw/create an image, help them
- Be enthusiastic and helpful about EVERY topic
```

#### 5. Update `src/components/novachat/WelcomeScreen.tsx`
- Add image generation suggestion cards (e.g., "Generate a sunset over mountains 🌄")
- Update description to mention image generation capability

### What stays unchanged
- All other modules (Home, Movion, Bookshelf, Groups, Profile, Messenger)
- Conversation sidebar, history, delete, rename functionality
- Database tables (ai_conversations, ai_messages)
- All UI components outside NovaChat

### Technical Notes
- `LOVABLE_API_KEY` is already configured as a secret
- Edge function will handle both streaming text and image generation
- Images will be stored as base64 data URLs in message content
- No database schema changes needed

