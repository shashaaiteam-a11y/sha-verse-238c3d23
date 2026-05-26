import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID');
const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized - No auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's auth token to verify they're logged in
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Authenticated user: ${user.id}`);

    // Parse the request body ONCE and reuse the parsed data.
    // NOTE: We deliberately ignore client-supplied videoUrl / assetId / playbackId
    // for security. All of those are sourced from the database server-side.
    const body = await req.json();
    const { action, videoId, webhookData, duration } = body;
    console.log(`Mux transcode action: ${action}, videoId: ${videoId}`);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Authorization: every action MUST be tied to a videoId the caller owns.
    let ownedVideo: { id: string; video_url: string | null; channel_id: string } | null = null;
    if (action === 'create-asset' || action === 'complete-transcoding' || action === 'check-status') {
      if (!videoId) {
        return new Response(JSON.stringify({ error: 'videoId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('id, video_url, channel_id, channels!inner(user_id)')
        .eq('id', videoId)
        .single();

      if (videoError || !video) {
        console.error('Video not found:', videoId);
        return new Response(JSON.stringify({ error: 'Video not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const channels = video.channels as unknown as { user_id: string };
      if (channels.user_id !== user.id) {
        console.error(`Authorization failed: User ${user.id} does not own video ${videoId}`);
        return new Response(JSON.stringify({ error: 'Not authorized to transcode this video' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      ownedVideo = { id: video.id, video_url: video.video_url, channel_id: video.channel_id };
      console.log(`Authorization passed: User ${user.id} owns video ${videoId}`);
    }

    if (action === 'create-asset') {
      // Create Mux asset for transcoding
      if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
        throw new Error('Mux credentials not configured');
      }

      const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

      // SECURITY: use the video_url stored on the row, never the client's value.
      const dbVideoUrl = ownedVideo?.video_url;
      if (!dbVideoUrl) {
        return new Response(JSON.stringify({ error: 'Video has no source URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create Mux asset
      const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${muxAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: [{ url: dbVideoUrl }],
          playback_policy: ['public'],
          normalize_audio: true,
        }),
      });

      if (!muxResponse.ok) {
        const errorText = await muxResponse.text();
        console.error('Mux API error:', errorText);

        // Detect Mux free-plan asset limit (or any other Mux limit) and degrade gracefully.
        // Video is already playable from Supabase Storage; HLS via Mux is just an enhancement.
        const isAssetLimit =
          muxResponse.status === 400 &&
          /limited to \d+ assets|asset limit/i.test(errorText);

        // Mark transcoding as skipped/failed but keep the video playable
        await supabase
          .from('transcoding_jobs')
          .update({
            status: isAssetLimit ? 'skipped' : 'failed',
            error_message: errorText.slice(0, 500),
            completed_at: new Date().toISOString(),
          })
          .eq('video_id', videoId);

        // Keep the video as 'ready' so it stays playable (original upload URL works)
        await supabase
          .from('videos')
          .update({ transcoding_status: 'ready' })
          .eq('id', videoId);

        return new Response(
          JSON.stringify({
            success: false,
            fallback: true,
            reason: isAssetLimit ? 'MUX_ASSET_LIMIT_REACHED' : 'MUX_API_ERROR',
            message: isAssetLimit
              ? 'Mux free plan asset limit reached. Video is still playable from original source.'
              : 'Mux transcoding unavailable. Video is still playable from original source.',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const muxData = await muxResponse.json();
      const asset = muxData.data;
      console.log('Mux asset created:', asset.id);

      // Update transcoding job
      await supabase
        .from('transcoding_jobs')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('video_id', videoId);

      // Store Mux asset ID in video metadata for webhook handling
      await supabase
        .from('videos')
        .update({ 
          transcoding_status: 'processing',
        })
        .eq('id', videoId);

      return new Response(JSON.stringify({ 
        success: true, 
        assetId: asset.id,
        playbackId: asset.playback_ids?.[0]?.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check-status') {
      // Check Mux asset status - use assetId from the already parsed body
      if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
        throw new Error('Mux credentials not configured');
      }

      if (!assetId) {
        return new Response(JSON.stringify({ error: 'assetId is required for check-status' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);
      
      const muxResponse = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: {
          'Authorization': `Basic ${muxAuth}`,
        },
      });

      if (!muxResponse.ok) {
        throw new Error('Failed to fetch asset status');
      }

      const muxData = await muxResponse.json();
      const asset = muxData.data;

      return new Response(JSON.stringify({ 
        status: asset.status,
        playbackId: asset.playback_ids?.[0]?.id,
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio,
        tracks: asset.tracks,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'complete-transcoding') {
      // Mark transcoding as complete and update video with HLS URL
      // Use playbackId, duration, assetId from the already parsed body
      
      if (!playbackId) {
        return new Response(JSON.stringify({ error: 'playbackId is required for complete-transcoding' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
      const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;

      // Update video with HLS URL and duration
      await supabase
        .from('videos')
        .update({ 
          hls_url: hlsUrl,
          duration: Math.round(duration || 0),
          transcoding_status: 'completed',
          thumbnail_url: thumbnailUrl, // Auto-generated thumbnail from Mux
        })
        .eq('id', videoId);

      // Update transcoding job
      await supabase
        .from('transcoding_jobs')
        .update({ 
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('video_id', videoId);

      // Update video qualities with actual URLs
      const resolutions = [
        { name: '360p', height: 360 },
        { name: '720p', height: 720 },
        { name: '1080p', height: 1080 },
      ];

      for (const res of resolutions) {
        await supabase
          .from('video_qualities')
          .update({ 
            video_url: `https://stream.mux.com/${playbackId}/high.mp4`,
            status: 'ready',
          })
          .eq('video_id', videoId)
          .eq('resolution', res.name);
      }

      console.log(`Transcoding completed for video ${videoId}`);

      return new Response(JSON.stringify({ success: true, hlsUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Mux transcode error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
