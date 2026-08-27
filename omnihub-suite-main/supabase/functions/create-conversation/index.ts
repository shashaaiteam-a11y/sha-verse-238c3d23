import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user with anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { otherUserId } = await req.json();
    if (!otherUserId || typeof otherUserId !== "string" || !UUID_RE.test(otherUserId)) {
      return new Response(
        JSON.stringify({ error: "Invalid otherUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (otherUserId === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot start a conversation with yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for database operations (bypasses RLS) — every write
    // below is gated by the authorization checks that follow.
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // --- Authorization: same rule the conversation_members RLS policy uses ---
    // Direct conversations are friends-only, and blocked pairs are rejected.
    const [{ data: areFriends, error: friendError }, { data: blocks, error: blockError }] =
      await Promise.all([
        serviceClient.rpc("are_friends", { _user1: user.id, _user2: otherUserId }),
        serviceClient
          .from("user_blocks")
          .select("id")
          .or(
            `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`
          )
          .limit(1),
      ]);

    if (friendError || blockError) {
      console.error("Authorization check failed:", friendError ?? blockError);
      return new Response(
        JSON.stringify({ error: "Unable to verify messaging permission" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (blocks && blocks.length > 0) {
      return new Response(
        JSON.stringify({ error: "You cannot message this user." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (areFriends !== true) {
      return new Response(
        JSON.stringify({ error: "You can only message your friends." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if conversation already exists
    const { data: existingConvos } = await serviceClient
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (existingConvos && existingConvos.length > 0) {
      const convoIds = existingConvos.map((c: { conversation_id: string }) => c.conversation_id);

      const { data: otherMember } = await serviceClient
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", convoIds);

      if (otherMember && otherMember.length > 0) {
        const { data: convoDetails } = await serviceClient
          .from("conversations")
          .select("id, is_group")
          .eq("id", otherMember[0].conversation_id)
          .eq("is_group", false)
          .maybeSingle();

        if (convoDetails) {
          return new Response(
            JSON.stringify({ conversationId: convoDetails.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Create new conversation
    const { data: newConvo, error: convoError } = await serviceClient
      .from("conversations")
      .insert({ is_group: false, created_by: user.id })
      .select()
      .single();

    if (convoError) {
      console.error("Conversation creation error:", convoError);
      throw convoError;
    }

    // Add both members
    const { error: membersError } = await serviceClient
      .from("conversation_members")
      .insert([
        { conversation_id: newConvo.id, user_id: user.id, role: "member" },
        { conversation_id: newConvo.id, user_id: otherUserId, role: "member" },
      ]);

    if (membersError) {
      console.error("Members error:", membersError);
      throw membersError;
    }

    return new Response(
      JSON.stringify({ conversationId: newConvo.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to start conversation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
