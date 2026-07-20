// Edge function: generates the SHA-VERSE startup narration MP3 via Lovable AI TTS.
// Returns cached MP3 so the client only pays generation cost when the CDN/browser
// cache is cold. No auth required — one-liner brand narration only.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Elegant, warm, calm female voice. Neutral international English accent.
const NARRATION = "Shah-Verse. The Next Generation.";
const VOICE = "shimmer";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: NARRATION,
        voice: VOICE,
        response_format: "mp3",
        speed: 0.95,
        instructions:
          "Speak as a warm, elegant, confident, calm, premium modern female narrator with a neutral international English accent. Pronounce SHA-VERSE as 'Shah Verse' with a brief natural pause after 'Shah-Verse'. Crystal clear, human, no robotic tone.",
      }),
    });

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "TTS upstream failed", status: upstream.status, details }),
        { status: upstream.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const audio = await upstream.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
