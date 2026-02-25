import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid session. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { otherUserId } = await req.json();
    if (!otherUserId) {
      return new Response(
        JSON.stringify({ error: "Missing otherUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if conversation already exists
    const { data: existingConvos } = await serviceClient
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existingConvos && existingConvos.length > 0) {
      const convoIds = existingConvos.map((c: any) => c.conversation_id);
      
      const { data: otherMember } = await serviceClient
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', convoIds);

      if (otherMember && otherMember.length > 0) {
        const { data: convoDetails } = await serviceClient
          .from('conversations')
          .select('id, is_group')
          .eq('id', otherMember[0].conversation_id)
          .eq('is_group', false)
          .maybeSingle();

        if (convoDetails) {
          console.log("Found existing conversation:", convoDetails.id);
          return new Response(
            JSON.stringify({ conversationId: convoDetails.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Create new conversation
    const { data: newConvo, error: convoError } = await serviceClient
      .from('conversations')
      .insert({ is_group: false, created_by: user.id })
      .select()
      .single();

    if (convoError) {
      console.error("Conversation creation error:", convoError);
      throw convoError;
    }

    console.log("Created conversation:", newConvo.id);

    // Add both members
    const { error: membersError } = await serviceClient
      .from('conversation_members')
      .insert([
        { conversation_id: newConvo.id, user_id: user.id, role: 'member' },
        { conversation_id: newConvo.id, user_id: otherUserId, role: 'member' }
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
