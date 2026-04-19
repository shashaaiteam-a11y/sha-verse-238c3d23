/**
 * NovaChat Module - Public API
 *
 * MODULE ISOLATION RULES:
 * 1. Other modules MUST NOT import from src/modules/novachat/* directly.
 *    They consume novachat only via the route /novachat.
 * 2. This module MAY import from @/shared/*, @/integrations/*, @/contexts/*.
 * 3. This module MUST NOT import from any other src/modules/<name>/*.
 *
 * Owned by NovaChat:
 *   - Pages: NovaChat
 *   - Components: ChatInput, ChatMessage, ChatSidebar, WelcomeScreen
 *   - Hooks: useNovaChat
 *   - Edge Function: novachat-ai (Gemini 2.5 Flash)
 */
export { default as NovaChat } from './pages/NovaChat';
