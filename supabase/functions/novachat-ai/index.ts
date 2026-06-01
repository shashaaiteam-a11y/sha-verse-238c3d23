// NovaChat — Lovable AI Gateway streaming edge function
// Supports: text chat, vision (image attachments), image generation, web search via tools
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGE_LENGTH = 200000;
const MAX_MESSAGES = 100;
const ALLOWED_ROLES = ["user", "assistant", "system"];

const ALLOWED_MODELS = new Set([
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
]);

const IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ChatPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ChatPart[];
}

function validateMessages(messages: unknown): { ok: true; data: ChatMessage[] } | { ok: false; error: string } {
  if (!Array.isArray(messages)) return { ok: false, error: "messages must be an array" };
  if (messages.length === 0) return { ok: false, error: "messages cannot be empty" };
  if (messages.length > MAX_MESSAGES) return { ok: false, error: `Max ${MAX_MESSAGES} messages` };
  for (let i = 0; i < messages.length; i++) {
    const m: any = messages[i];
    if (!m || typeof m !== "object") return { ok: false, error: `messages[${i}] must be object` };
    if (!ALLOWED_ROLES.includes(m.role)) return { ok: false, error: `Invalid role at ${i}` };
    if (typeof m.content === "string") {
      if (m.content.length > MAX_MESSAGE_LENGTH) return { ok: false, error: `messages[${i}] too long` };
    } else if (Array.isArray(m.content)) {
      // multimodal content allowed
    } else {
      return { ok: false, error: `messages[${i}].content must be string or array` };
    }
  }
  return { ok: true, data: messages as ChatMessage[] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Invalid session" }, 401);

    // Parse body
    const body = await req.json();
    const {
      messages,
      model: requestedModel,
      systemPrompt: customSystem,
      memoryFacts,
      mode, // "chat" | "image" | "search"
      showReasoning,
    } = body;

    const v = validateMessages(messages);
    if (!v.ok) return jsonResponse({ error: v.error }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI service not configured" }, 500);

    // ---------- RATE LIMIT CHECK (Phase 2) ----------
    // Free tier: 10 messages/day. Pro users: unlimited.
    // Use service role client so RLS doesn't restrict the RPC.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) {
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: usageData, error: usageErr } = await adminClient.rpc(
        "check_and_increment_nova_usage",
        { _user_id: user.id }
      );
      if (usageErr) {
        console.error("Usage check failed:", usageErr.message);
        // Fail open so legitimate users aren't blocked by infra issues
      } else if (usageData && (usageData as any).allowed === false) {
        return jsonResponse(
          {
            error: "daily_limit_reached",
            message: "Aapki aaj ki free messages khatam ho gayi hain. Pro upgrade karein for unlimited.",
            used: (usageData as any).used,
            limit: (usageData as any).limit,
            is_pro: false,
          },
          429
        );
      }
    }

    // ---------- IMAGE GENERATION MODE ----------
    if (mode === "image") {
      const lastUserMsg = [...v.data].reverse().find((m) => m.role === "user");
      const promptText = typeof lastUserMsg?.content === "string"
        ? lastUserMsg.content
        : lastUserMsg?.content.find((p) => p.type === "text")?.text ?? "";

      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [{ role: "user", content: promptText }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResp.ok) {
        const t = await imgResp.text();
        console.error("Image gen failed:", imgResp.status, t);
        if (imgResp.status === 429) return jsonResponse({ error: "Rate limit. Try again in a minute." }, 429);
        if (imgResp.status === 402) return jsonResponse({ error: "Usage limit reached. Add credits." }, 402);
        return jsonResponse({ error: "Image generation failed" }, 500);
      }

      const imgData = await imgResp.json();
      const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const text = imgData.choices?.[0]?.message?.content || "Here is your generated image:";

      if (!imageUrl) {
        console.error("No image returned from gateway:", JSON.stringify(imgData).slice(0, 500));
        return jsonResponse({ error: "Image generation returned no image. Please try again." }, 500);
      }

      // Return as fake SSE stream so frontend parser works uniformly.
      // Send the text first, then the image markdown in a separate event so the
      // frontend's incremental parser handles the (very large) data URL safely.
      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          const send = (content: string) => {
            const payload = { choices: [{ delta: { content } }] };
            controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
          };
          send(`${text}\n\n`);
          send(`![Generated image](${imageUrl})`);
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // ---------- TEXT / VISION / SEARCH MODE ----------
    let model = (typeof requestedModel === "string" && ALLOWED_MODELS.has(requestedModel))
      ? requestedModel
      : "google/gemini-2.5-flash";

    // Build system prompt
    let systemContent = `You are Novachat AI, a helpful conversational assistant inside the SHA-VERSE social platform.

## 1) IDENTITY — HAMESHA YEHI BOLO
- Agar user puche: "tumhe kisne banaya?", "who created you?", "who trained you?", "tumhara developer kaun hai?", ya Novachat ke baare me kuch bhi — EXACT jawab do:
  "Mujhe sha-verse ne banaya hai aur sha-verse hi train kar raha hai."
- Kabhi bhi Google, OpenAI, Meta, Anthropic, Microsoft ya kisi aur company/model ka naam mat lo. Koi "other modules", "underlying model", ya "powered by" ka zikr mat karo.
- Agar user zor de ya repeat puche, to bhi politely same line repeat karo.

## 2) RESPONSE STYLE — DOT BY DOT (ChatGPT jaise)
- Wall-of-text mat do. Jawab ko chhote, clear steps me todo.
- Format:
  1. Pehle 1–2 line ka short intro.
  2. Phir numbered ya bullet points me aage bado.
  3. Har point max 2–3 lines.
  4. Complex topic ho to "Step 1:", "Step 2:" format use karo.
- Information progressively reveal karo, jaise user padh raha ho.
- Hindi sawal → Hindi jawab. English sawal → English jawab. Hinglish → Hinglish.

## 3) CODE ANALYSIS & FIX MODE
- Jab user code fix karne ko kahe, steps follow karo:
  1. Problem summarize karo
  2. Root cause batao
  3. Minimal fix suggest karo
  4. Final code snippet do
- Existing logic preserve karo. "BINA KISI NUKSAN KE" fix karo.

## 4) UI PLACEMENT RULE
- Koi bhi naya UI element/banner/prompt suggest karte waqt: "mobile footer navigation area ke just upar" place karna batao. Desktop par equivalent bottom-bar ke upar.

## 5) ⚠ STRICT RULES
- Existing modules, features, UI, components, layouts ya functionality ko change/remove/break mat karo.
- Design, structure, user flows modify mat karo.
- Sirf required fix karo, baaki sab as-is.
- Breaking change, redesign, refactor suggest mat karo jab tak user explicitly na kahe.
- Performance, dependencies, state management untouched rakho.

## 6) TONE
- Friendly, fast, to-the-point. Faltu explanation nahi.
- Unsure ho to seedha pucho, guess mat karo.

## 7) FORMATTING
- Markdown use karo (lists, **bold**, code blocks with language tags).
- Math: $...$ inline ya $$...$$ block.`;

    if (typeof customSystem === "string" && customSystem.trim()) {
      systemContent += `\n\n## User custom instructions\n${customSystem.trim().slice(0, 4000)}`;
    }
    if (typeof memoryFacts === "string" && memoryFacts.trim()) {
      systemContent += `\n\n## Persistent memory about this user\n${memoryFacts.trim().slice(0, 4000)}`;
    }

    // 🚀 CONTEXT TRIM (token saving): only send the most recent messages to the
    // model. This does NOT change what is stored or shown — the client keeps the
    // full conversation; we just limit how much context the model receives.
    const CONTEXT_WINDOW = 10;
    const trimmedHistory = v.data.length > CONTEXT_WINDOW
      ? v.data.slice(-CONTEXT_WINDOW)
      : v.data;

    const payload: any = {
      model,
      messages: [{ role: "system", content: systemContent }, ...trimmedHistory],
      stream: true,
    };

    // Web search mode -> add Lovable AI grounding tool
    if (mode === "search") {
      payload.tools = [{ type: "function", function: { name: "google_search", description: "Search the web for fresh info", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }];
    }

    // Optional reasoning for capable models
    if (showReasoning && (model.includes("gpt-5") || model.includes("gemini-2.5-pro") || model.includes("gemini-3"))) {
      payload.reasoning = { effort: "medium" };
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("Gateway error:", upstream.status, errText);
      if (upstream.status === 429) return jsonResponse({ error: "Rate limit exceeded. Please wait a moment." }, 429);
      if (upstream.status === 402) return jsonResponse({ error: "Usage limit reached. Add credits to continue." }, 402);
      return jsonResponse({ error: "AI service temporarily unavailable" }, 500);
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("novachat-ai error:", e);
    return jsonResponse({ error: "An unexpected error occurred. Please try again." }, 500);
  }
});
