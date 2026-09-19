#!/usr/bin/env node
// Operator-only, bounded imports into Movion's existing tables and public bucket.
// No source scraping, service-role credentials, frontend changes, or synthetic metrics.
import { createHash } from 'node:crypto';
import { createReadStream, openAsBlob } from 'node:fs';
import { mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const run = promisify(execFile);
const MiB = 1024 * 1024;
const licenses = {
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC-BY-3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

function text(value, name, max = 2000) {
  requireThat(typeof value === 'string' && value.trim().length > 0 && value.length <= max,
    `${name} must be nonempty text (at most ${max} characters)`);
  requireThat(!/[\x00-\x08\x0b-\x1f\x7f]/.test(value), `${name} contains control characters`);
  return value.trim();
}

function httpsUrl(value, name) {
  const url = new URL(text(value, name));
  requireThat(url.protocol === 'https:' && !url.username && !url.password,
    `${name} must be an HTTPS source/evidence page, without credentials`);
  return url.href;
}

export function validateManifest(input) {
  requireThat(input?.version === 1 && Array.isArray(input.items) && input.items.length > 0,
    'Expected { version: 1, items: [...] }');
  requireThat(input.items.length <= 100, 'Split manifests into at most 100 reviewed items');
  return input.items.map((item, index) => {
    const label = `items[${index}]`;
    requireThat(item && typeof item === 'object', `${label} must be an object`);
    requireThat(Object.hasOwn(licenses, item.license), `${label}: unsupported or missing license`);
    requireThat(['short', 'long'].includes(item.format), `${label}: format must be short or long`);
    const review = item.review;
    requireThat(review?.approved === true && review.fullVideoAndAudioRights === true &&
      review.spokenAudioConfirmed === true, `${label}: rights and spoken-audio review required`);
    text(review.reviewer, `${label}.review.reviewer`, 160);
    requireThat(typeof review.reviewedAt === 'string' && Number.isFinite(Date.parse(review.reviewedAt)) &&
      Date.parse(review.reviewedAt) <= Date.now(), `${label}: reviewedAt must be a real past date`);
    // The unchanged Shorts player shows a title, not the full attribution description.
    requireThat(item.format !== 'short' || item.license === 'CC0-1.0' ||
      review.embeddedAttributionConfirmed === true, `${label}: CC-BY Shorts need embedded attribution`);
    const file = text(item.file, `${label}.file`);
    requireThat((isAbsolute(file) || !/^[a-z][a-z0-9+.-]*:/i.test(file)) && extname(file).toLowerCase() === '.mp4',
      `${label}: file must be a local MP4, never a remote URL`);
    const tags = item.tags ?? [];
    requireThat(Array.isArray(tags) && tags.length <= 20, `${label}: at most 20 tags`);
    const language = text(item.language, `${label}.language`, 35);
    requireThat(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language), `${label}: use a language code such as hi, ur, en`);
    return {
      file, format: item.format, license: item.license, language,
      title: text(item.title, `${label}.title`, 200),
      description: item.description ? text(item.description, `${label}.description`, 3000) : '',
      creator: text(item.creator, `${label}.creator`, 300),
      attribution: text(item.attribution, `${label}.attribution`, 2000),
      changes: text(item.changes, `${label}.changes`, 1000),
      sourceUrl: httpsUrl(item.sourceUrl, `${label}.sourceUrl`),
      licenseEvidenceUrl: httpsUrl(item.licenseEvidenceUrl, `${label}.licenseEvidenceUrl`),
      category: text(item.category ?? 'Entertainment', `${label}.category`, 80),
      tags: [...new Set(tags.map(tag => text(tag, `${label}.tags`, 60)))],
    };
  });
}

async function sha256(stream) {
  const hash = createHash('sha256');
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

export function stableId(key) {
  // UUIDv8: identical source bytes yield one primary key, including across batches.
  const bytes = createHash('sha256').update(`movion-import-v1:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 128;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function mediaCommand(binary, args, timeout = 60_000) {
  try {
    return await run(binary, args, { timeout, maxBuffer: 2 * MiB });
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${binary} is required on the operator machine`);
    throw new Error(`${binary} could not validate this media file`);
  }
}

export async function inspectMedia(item, baseDirectory, maxBytes = 50 * MiB) {
  const file = await realpath(resolve(baseDirectory, item.file));
  const info = await stat(file);
  requireThat(info.isFile() && info.size > 0 && info.size <= maxBytes,
    `${item.title}: file is empty, not a regular file, or exceeds the upload byte limit`);
  // Node invalidates this file-backed Blob if its file changes after opening.
  const blob = await openAsBlob(file, { type: 'video/mp4' });
  const { stdout } = await mediaCommand('ffprobe', [
    '-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_format', '-show_streams', '-of', 'json', file,
  ]);
  const media = JSON.parse(stdout);
  const video = media.streams?.find(stream => stream.codec_type === 'video' && !stream.disposition?.attached_pic);
  const audio = media.streams?.find(stream => stream.codec_type === 'audio');
  const duration = Number(media.format?.duration);
  requireThat(media.format?.format_name?.split(',').includes('mp4') &&
    video?.codec_name === 'h264' && video.pix_fmt === 'yuv420p' && audio?.codec_name === 'aac',
    `${item.title}: requires browser-compatible H.264/yuv420p video AND AAC audio in MP4`);
  requireThat(Number.isFinite(duration) && duration > 0 && duration <= 7200,
    `${item.title}: duration must be between 0 and 7200 seconds`);
  const rotation = Number(video.side_data_list?.find(data => data.rotation !== undefined)?.rotation ?? video.tags?.rotate ?? 0);
  const sideways = Math.abs(rotation % 180) === 90;
  const width = sideways ? video.height : video.width;
  const height = sideways ? video.width : video.height;
  requireThat(width > 0 && height > 0 && width <= 3840 && height <= 3840, `${item.title}: invalid or oversized frame`);
  requireThat(item.format !== 'short' || (height >= width && duration <= 180.1),
    `${item.title}: pilot Shorts must be portrait/square and at most 180 seconds`);
  // Metadata and a working first frame do not establish that the complete asset decodes.
  await mediaCommand('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-xerror',
    '-err_detect', 'explode', '-protocol_whitelist', 'file,pipe', '-i', file,
    '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], 300_000);
  const digest = await sha256(blob.stream());
  return { item, file, blob, bytes: info.size, digest, id: stableId(digest), duration, width, height };
}

async function posterFor(media, directory) {
  const path = join(directory, `${media.id}.jpg`);
  await mediaCommand('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    '-protocol_whitelist', 'file,pipe', '-ss', String(Math.min(2, media.duration / 2)), '-i', media.file,
    '-map', '0:v:0', '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', path]);
  const bytes = await readFile(path);
  return { bytes, digest: await sha256([bytes]) };
}

function databaseError(error, operation) {
  if (error) throw new Error(`${operation} failed (${error.code ?? error.statusCode ?? 'network or permission error'}). Retry after checking the account and connection.`);
}

export async function verifyDestination(client, channelId) {
  requireThat(uuidPattern.test(channelId ?? ''), 'A valid channel UUID is required for publishing');
  const { data: { user } = {}, error: authError } = await client.auth.getUser();
  databaseError(authError, 'Authentication');
  requireThat(user && !user.is_anonymous, 'Sign in as the destination channel owner');
  const { data: channel, error } = await client.from('channels')
    .select('id,user_id,channel_type,approval_status').eq('id', channelId).maybeSingle();
  databaseError(error, 'Channel lookup');
  requireThat(channel?.user_id === user.id && channel.channel_type === 'video' && channel.approval_status === 'approved',
    'Destination must be an approved video channel owned by the signed-in account');
  return channel;
}

async function existingVideo(client, id) {
  const { data, error } = await client.from('videos').select('id,channel_id,video_url,thumbnail_url').eq('id', id).maybeSingle();
  databaseError(error, 'Duplicate lookup');
  return data;
}

async function uploadImmutable(bucket, path, body, digest, contentType) {
  const { error } = await bucket.upload(path, body, {
    contentType, upsert: false, cacheControl: '31536000', metadata: { sha256: digest },
  });
  if (error) {
    // Includes a response lost after a successful upload. Never overwrite an object.
    const { data: existing, error: readError } = await bucket.download(path);
    if (readError || !existing || await sha256(existing.stream()) !== digest) {
      databaseError(error, 'Immutable media upload');
    }
  }
  return bucket.getPublicUrl(path).data.publicUrl;
}

function descriptionFor(item) {
  return [item.description, `Creator: ${item.creator}`, `Attribution: ${item.attribution}`,
    `Source: ${item.sourceUrl}`, `License: ${item.license} — ${licenses[item.license]}`,
    `License evidence: ${item.licenseEvidenceUrl}`, `Changes: ${item.changes}`,
    `Spoken language: ${item.language}`].filter(Boolean).join('\n\n');
}

async function ensureOriginalQuality(client, media, url) {
  // No (video_id,resolution) unique constraint exists. A stable primary key handles retries.
  const { error } = await client.from('video_qualities').upsert({
    id: stableId(`${media.id}:original`), video_id: media.id, resolution: 'original',
    video_url: url, status: 'ready', width: media.width, height: media.height,
  }, { onConflict: 'id', ignoreDuplicates: true });
  databaseError(error, 'Original quality registration');
}

export async function publishOne(client, channel, media, poster) {
  const prior = await existingVideo(client, media.id);
  if (prior) {
    if (prior.channel_id === channel.id) {
      requireThat(prior.video_url?.endsWith(`/${media.digest}.mp4`), 'Existing video does not match the imported asset');
      await ensureOriginalQuality(client, media, prior.video_url);
    }
    return { id: media.id, status: 'already-present', channelId: prior.channel_id };
  }
  // Rehash before making anything public, so a file edited after preflight cannot silently replace reviewed bytes.
  requireThat(await sha256(createReadStream(media.file)) === media.digest, 'Media changed after preflight; run review again');
  const bucket = client.storage.from('videos');
  const prefix = `${channel.user_id}/movion-import`;
  const thumbnailUrl = await uploadImmutable(bucket, `${prefix}/${poster.digest}.jpg`, poster.bytes, poster.digest, 'image/jpeg');
  const videoUrl = await uploadImmutable(bucket, `${prefix}/${media.digest}.mp4`,
    media.blob, media.digest, 'video/mp4');
  const item = media.item;
  const { error } = await client.from('videos').upsert({
    id: media.id, channel_id: channel.id, title: item.title, description: descriptionFor(item),
    video_url: videoUrl, thumbnail_url: thumbnailUrl, duration: Math.max(1, Math.round(media.duration)),
    is_short: item.format === 'short', category: item.category, tags: item.tags, transcoding_status: 'ready',
    // Counters, timestamps, engagement/trending scores are deliberately database defaults.
  }, { onConflict: 'id', ignoreDuplicates: true });
  databaseError(error, 'Video insert');
  const saved = await existingVideo(client, media.id);
  requireThat(saved, 'The video insert was not visible; retry after checking RLS');
  if (saved.channel_id !== channel.id) return { id: media.id, status: 'already-present', channelId: saved.channel_id };
  requireThat(saved.video_url === videoUrl && saved.thumbnail_url === thumbnailUrl, 'Saved media differs from the reviewed import');
  await ensureOriginalQuality(client, media, videoUrl);
  return { id: media.id, status: 'published', channelId: channel.id };
}

export async function importBatch({ manifest, baseDirectory = '.', publish = false, client, channelId,
  maxItems = 10, maxFileMiB = 50, maxTotalMiB = 250, onResult = () => {} }) {
  for (const [name, value, cap] of [['maxItems', maxItems, 100], ['maxFileMiB', maxFileMiB, 500], ['maxTotalMiB', maxTotalMiB, 2000]]) {
    requireThat(Number.isSafeInteger(value) && value > 0 && value <= cap, `${name} must be an integer from 1 to ${cap}`);
  }
  const items = validateManifest(manifest);
  requireThat(items.length <= maxItems, 'Manifest exceeds maxItems; review and split the batch first');
  const media = [];
  const seen = new Set();
  let bytes = 0;
  // Entire batch is preflighted before the first storage write.
  for (const item of items) {
    const entry = await inspectMedia(item, baseDirectory, maxFileMiB * MiB);
    requireThat(!seen.has(entry.id), `${item.title}: duplicate media bytes in this batch`);
    seen.add(entry.id);
    bytes += entry.bytes;
    requireThat(bytes <= maxTotalMiB * MiB, 'Batch exceeds maxTotalMiB; no content was uploaded');
    media.push(entry);
  }
  const directory = await mkdtemp(join(tmpdir(), 'movion-import-'));
  try {
    const posters = [];
    for (const entry of media) posters.push(await posterFor(entry, directory));
    bytes += posters.reduce((total, poster) => total + poster.bytes.length, 0);
    requireThat(bytes <= maxTotalMiB * MiB, 'Media plus thumbnails exceed the batch byte limit');
    let channel;
    if (publish) {
      requireThat(client, 'An authenticated Supabase client is required for publishing');
      channel = await verifyDestination(client, channelId);
    }
    const results = [];
    for (const [index, entry] of media.entries()) {
      const result = publish ? await publishOne(client, channel, entry, posters[index]) : {
        id: entry.id, title: entry.item.title, status: 'preflight-passed', format: entry.item.format,
        durationSeconds: entry.duration, width: entry.width, height: entry.height,
        bytes: entry.bytes, sha256: entry.digest, license: entry.item.license, language: entry.item.language,
      };
      results.push(result);
      onResult(result);
    }
    return { mode: publish ? 'publish' : 'dry-run', items: results.length, totalBytes: bytes, results };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    manifest: { type: 'string' }, channel: { type: 'string' }, publish: { type: 'boolean', default: false },
    'max-items': { type: 'string', default: '10' }, 'max-file-mib': { type: 'string', default: '50' },
    'max-total-mib': { type: 'string', default: '250' }, help: { type: 'boolean', default: false },
  } });
  if (values.help) {
    console.log('node scripts/import-movion-content.mjs --manifest /path/batch.json [--publish --channel UUID]\nDefaults to offline preflight. See docs/movion-content-import.md for rights, account setup and batch limits.');
    return;
  }
  requireThat(values.manifest, '--manifest is required; use --help for usage');
  const manifestFile = resolve(values.manifest);
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  let client;
  if (values.publish) {
    const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key, MOVION_ACCESS_TOKEN: token } = process.env;
    requireThat(url && key && token, 'Publishing requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and MOVION_ACCESS_TOKEN from the channel owner (never put secrets in a manifest)');
    const parsed = new URL(url);
    requireThat(parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.pathname === '/' && !parsed.search && !parsed.hash,
      'SUPABASE_URL must be the HTTPS project origin');
    requireThat(!key.startsWith('sb_secret_'), 'Use a publishable key and the channel owner access token, not a secret key');
    if (key.split('.').length === 3) {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      requireThat(payload.role === 'anon', 'Legacy project keys must be anon keys, never service-role keys');
    }
    client = createClient(parsed.origin, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` },
        fetch: (url, options = {}) => fetch(url, { ...options,
          signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000),
        }),
      },
    });
  }
  const summary = await importBatch({ manifest, baseDirectory: dirname(manifestFile),
    publish: values.publish, client, channelId: values.channel,
    maxItems: Number(values['max-items']), maxFileMiB: Number(values['max-file-mib']), maxTotalMiB: Number(values['max-total-mib']),
    onResult: result => console.log(JSON.stringify(result)),
  });
  console.log(JSON.stringify({ mode: summary.mode, items: summary.items, totalBytes: summary.totalBytes }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Movion import: ${error.message}`); process.exitCode = 1; });
}
