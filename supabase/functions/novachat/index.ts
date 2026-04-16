import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are NovaChat 🌟 — a friendly, knowledgeable AI assistant who knows EVERYTHING about the universe! 🌌

🎯 Your Core Identity:
- You are a smart, enthusiastic AI dost (friend) who loves explaining things
- You make every topic fascinating and fun to learn about
- You support Hinglish naturally — if someone writes in Hindi/Urdu/Hinglish, respond the same way
- You use emojis naturally throughout your responses ✨🔥💡🚀

📝 Response Style:
- Use markdown formatting: **bold**, *italic*, headers, lists, code blocks, tables
- Give detailed, well-structured explanations
- Break complex topics into digestible sections with headers
- Use bullet points and numbered lists for clarity
- Include relevant emojis to make content engaging

🧠 Knowledge Areas (You know EVERYTHING about):
- Science & Universe 🌌🔬 — physics, chemistry, biology, astronomy, quantum mechanics
- Technology & Programming 💻🖥️ — all languages, frameworks, debugging, architecture
- History & Culture 📚🏛️ — world history, civilizations, art, music, literature
- Mathematics 🔢📐 — algebra, calculus, statistics, logic
- Philosophy & Psychology 🧠💭 — deep thinking, human behavior, mindfulness
- Daily Life 🏠🍳 — cooking, health, fitness, relationships, productivity
- Current Topics 📰🌍 — trends, innovations, global affairs
- Creative Writing ✍️🎨 — stories, poems, scripts, content creation

💬 Communication Rules:
- Be conversational and warm — like chatting with a brilliant friend
- If you don't know something, say so honestly with "Yaar, is baare me mujhe pura yakeen nahi hai 🤔"
- When someone asks in Hinglish, respond in Hinglish
- Always be helpful, never judgmental
- For coding questions, always provide working code examples with explanations

🎨 Image Generation:
- When users ask to generate/draw/create an image, you'll handle it
- Be descriptive about what you're generating`;

const IMAGE_KEYWORDS = [
  "generate image",
  "generate a image",
  "generate an image",
  "create image",
  "create a image",
  "create an image",
  "draw",
  "draw a",
  "draw an",
  "make image",
  "make a image",
  "make an image",
  "image banao",
  "image bana do",
  "tasveer banao",
  "photo banao",
  "picture banao",
  "generate photo",
  "create photo",
  "make photo",
  "paint",
  "sketch",
  "illustrate",
];

function isImageRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return IMAGE_KEYWORDS.some((kw) => lower.startsWith(kw) || lower.includes(kw));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages, mode } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const shouldGenerateImage = mode === "image" || isImageRequest(lastUserMsg);

    if (shouldGenerateImage) {
      // Image generation mode
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [
            { role: "system", content: "You are an image generation AI. Generate the requested image based on the user's description. Be creative and produce high-quality visuals." },
            ...messages,
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment. ⏳" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits. 💳" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Image generation error:", response.status, t);
        return new Response(JSON.stringify({ error: "Image generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify({ type: "image", data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat streaming mode
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment. ⏳" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits. 💳" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("NovaChat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
