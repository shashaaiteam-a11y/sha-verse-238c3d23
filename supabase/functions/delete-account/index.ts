// Permanent account deletion edge function.
// 1) Verifies the caller's JWT.
// 2) Deletes all storage files owned by the user (prefix = userId) across buckets.
// 3) Runs the dependency-safe DB cleanup (public.delete_user_account).
// 4) Permanently deletes the Supabase Auth user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STORAGE_BUCKETS = ["avatars", "books", "chat-media", "post-images", "videos"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the JWT and resolve the user id (cannot be spoofed).
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // 1) Delete the user's storage files (best-effort per bucket).
    for (const bucket of STORAGE_BUCKETS) {
      try {
        const toRemove: string[] = [];
        // List the user's root folder and one nested level (e.g. <uid>/groups/...).
        const { data: top } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
        for (const entry of top ?? []) {
          if (entry.id === null) {
            // It's a folder — list its contents.
            const { data: nested } = await admin.storage
              .from(bucket)
              .list(`${userId}/${entry.name}`, { limit: 1000 });
            for (const f of nested ?? []) {
              if (f.id !== null) toRemove.push(`${userId}/${entry.name}/${f.name}`);
            }
          } else {
            toRemove.push(`${userId}/${entry.name}`);
          }
        }
        if (toRemove.length > 0) {
          await admin.storage.from(bucket).remove(toRemove);
        }
      } catch (_e) {
        // Continue — storage cleanup is best-effort and must not block deletion.
      }
    }

    // 2) Dependency-safe database cleanup.
    const { error: rpcErr } = await admin.rpc("delete_user_account", { p_user_id: userId });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: `DB cleanup failed: ${rpcErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Permanently delete the auth user.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(JSON.stringify({ error: `Auth deletion failed: ${delErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
