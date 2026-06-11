// compress-image edge function
// Converts an already-uploaded image into 3 optimized WebP variants:
//   - thumbnail  (200px wide)
//   - medium     (800px wide)
//   - compressed (original size, WebP compressed)
//
// IMPORTANT (per project rules):
//   - This function is ADDITIVE only. It does NOT touch the existing upload
//     UI/flow, and it does NOT change storage bucket names or policies.
//   - It reads the original from the SAME bucket and writes the variants back
//     into the SAME bucket alongside the original.
//   - SILENT FAIL: on any error the original file is left exactly as-is and we
//     return HTTP 200 with { ok: false }. Callers can safely ignore failures.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

import { decode as decodeJpeg } from 'npm:@jsquash/jpeg@1.4.0';
import { decode as decodePng } from 'npm:@jsquash/png@3.0.1';
import { decode as decodeWebp, encode as encodeWebp } from 'npm:@jsquash/webp@1.4.0';
import resize from 'npm:@jsquash/resize@2.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type Variant = { suffix: string; width: number | null; quality: number };

const VARIANTS: Variant[] = [
  { suffix: '_thumb', width: 200, quality: 75 },
  { suffix: '_medium', width: 800, quality: 80 },
  { suffix: '_compressed', width: null, quality: 82 }, // original size, just compressed
];

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 401,
  });
}

// Decode any common raster image into ImageData based on magic bytes.
async function decodeImage(bytes: Uint8Array): Promise<ImageData> {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  if (isPng) return await decodePng(buf);
  if (isJpeg) return await decodeJpeg(buf);
  if (isWebp) return await decodeWebp(buf);
  // Fallback: try JPEG decode
  return await decodeJpeg(buf);
}

function targetSize(src: ImageData, width: number | null) {
  if (!width || width >= src.width) {
    return { width: src.width, height: src.height };
  }
  const height = Math.max(1, Math.round((src.height / src.width) * width));
  return { width, height };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 🔒 AUTH GATE: only authenticated users may invoke this function.
  // The frontend already sends the user's JWT automatically via
  // supabase.functions.invoke(), so existing flows are unaffected.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized();
  }
  const token = authHeader.replace('Bearer ', '');
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
  const claims = claimsData?.claims as { role?: string; sub?: string } | undefined;
  if (claimsErr || !claims || claims.role !== 'authenticated' || !claims.sub) {
    return unauthorized();
  }

  try {
    const { bucket, path } = await req.json().catch(() => ({}));

    if (!bucket || !path || typeof bucket !== 'string' || typeof path !== 'string') {
      // Bad input — silent fail per requirements
      return ok({ ok: false, error: 'missing bucket or path' });
    }

    // 🔒 PATH OWNERSHIP GATE: the service role bypasses storage RLS, so we must
    // verify the caller owns the target path. All app uploads use the
    // convention `<auth.uid()>/...` (enforced by storage RLS on the original
    // upload), so the first path segment MUST equal the caller's user id.
    // This blocks a user from triggering writes into another user's folder.
    if (!path.startsWith(`${claims.sub}/`)) {
      return unauthorized();
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);


    // 1) Download the original
    const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(path);
    if (dlErr || !file) {
      return ok({ ok: false, error: dlErr?.message ?? 'download failed' });
    }

    const original = new Uint8Array(await file.arrayBuffer());

    // 2) Decode once
    const decoded = await decodeImage(original);

    // 3) Build variant paths: <dir>/<name>_<suffix>.webp
    const lastSlash = path.lastIndexOf('/');
    const dir = lastSlash >= 0 ? path.slice(0, lastSlash + 1) : '';
    const fileNameWithExt = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
    const dotIdx = fileNameWithExt.lastIndexOf('.');
    const base = dotIdx >= 0 ? fileNameWithExt.slice(0, dotIdx) : fileNameWithExt;

    const results: Record<string, string> = {};

    // 4) Generate + upload each variant; per-variant failures are isolated.
    for (const v of VARIANTS) {
      try {
        const { width, height } = targetSize(decoded, v.width);
        const imageData =
          width === decoded.width && height === decoded.height
            ? decoded
            : await resize(decoded, { width, height });

        const webp = await encodeWebp(imageData, { quality: v.quality });
        const variantPath = `${dir}${base}${v.suffix}.webp`;

        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(variantPath, new Uint8Array(webp), {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!upErr) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(variantPath);
          results[v.suffix.replace('_', '')] = pub.publicUrl;
        }
      } catch (variantErr) {
        // Skip this variant only; original stays intact.
        console.error(`variant ${v.suffix} failed`, variantErr);
      }
    }

    return ok({ ok: true, variants: results });
  } catch (err) {
    // Global silent fail — original file is untouched.
    console.error('compress-image error', err);
    return ok({ ok: false, error: String(err) });
  }
});
