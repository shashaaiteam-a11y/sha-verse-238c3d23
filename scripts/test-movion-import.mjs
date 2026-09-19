import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { importBatch, validateManifest, verifyDestination } from './import-movion-content.mjs';

const run = promisify(execFile);
const ownerId = '10000000-0000-4000-8000-000000000001';
const channelId = '20000000-0000-4000-8000-000000000002';
let directory;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'movion-import-test-'));
  for (const [file, dimensions, audio] of [['short', '180x320', true], ['long', '320x180', true], ['silent', '180x320', false]]) {
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', `color=c=blue:s=${dimensions}:r=24:d=2`,
      ...(audio ? ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2'] : []),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', ...(audio ? ['-c:a', 'aac', '-shortest'] : []),
      '-movflags', '+faststart', join(directory, `${file}.mp4`)], { timeout: 30_000 });
  }
});
after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

function manifest(overrides = {}) {
  // Synthetic fixtures, including test tones, stay local and never enter a real project.
  return { version: 1, items: [{
    file: 'short.mp4', title: 'Local test fixture', format: 'short', language: 'hi',
    creator: 'Local test', attribution: 'Local test fixture, no external content',
    sourceUrl: 'https://example.org/fixture', licenseEvidenceUrl: 'https://example.org/license',
    license: 'CC0-1.0', changes: 'Synthetic test input',
    review: { approved: true, fullVideoAndAudioRights: true, spokenAudioConfirmed: true,
      reviewer: 'Local test', reviewedAt: '2025-01-01', embeddedAttributionConfirmed: false },
    ...overrides,
  }] };
}

function backend({ approval = 'approved', owner = ownerId, insertFailures = 0,
  qualityFailures = 0, loseUploadResponse = false } = {}) {
  const state = { requests: [], objects: new Map(), videos: new Map(), qualities: new Map(),
    inserts: [], updates: 0 };
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
  const fetch = async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method ?? 'GET';
    state.requests.push({ path: url.pathname, method });
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-user-token');
    if (url.pathname === '/auth/v1/user') return json({ id: ownerId, is_anonymous: false, app_metadata: {}, user_metadata: {} });
    if (url.pathname === '/rest/v1/channels') return json([{
      id: channelId, user_id: owner, channel_type: 'video', approval_status: approval,
    }]);
    if (url.pathname === '/rest/v1/videos') {
      if (method === 'GET') {
        const row = state.videos.get(url.searchParams.get('id')?.slice(3));
        return json(row ? [row] : []);
      }
      assert.equal(method, 'POST');
      if (insertFailures-- > 0) return json({ code: 'TEST_OUTAGE', message: 'simulated outage' }, 503);
      const row = JSON.parse(options.body);
      state.inserts.push(row);
      assert.match(new Headers(options.headers).get('Prefer'), /resolution=ignore-duplicates/);
      if (!state.videos.has(row.id)) state.videos.set(row.id, { ...row, views_count: 0, likes_count: 0 });
      return new Response(null, { status: 201 });
    }
    if (url.pathname === '/rest/v1/video_qualities') {
      assert.equal(method, 'POST');
      if (qualityFailures-- > 0) return json({ code: 'TEST_OUTAGE', message: 'simulated outage' }, 503);
      const row = JSON.parse(options.body);
      if (!state.qualities.has(row.id)) state.qualities.set(row.id, row);
      return new Response(null, { status: 201 });
    }
    if (url.pathname.startsWith('/storage/v1/object/videos/')) {
      if (method === 'GET') {
        const bytes = state.objects.get(url.pathname);
        return bytes ? new Response(bytes) : json({ error: 'NotFound', message: 'Not found' }, 404);
      }
      assert.equal(method, 'POST');
      assert.equal(new Headers(options.headers).get('x-upsert'), 'false');
      if (state.objects.has(url.pathname)) return json({ error: 'Duplicate', message: 'Already exists' }, 409);
      const body = options.body instanceof FormData ? options.body.get('') : options.body;
      const bytes = body instanceof Blob ? Buffer.from(await body.arrayBuffer()) : Buffer.from(body);
      state.objects.set(url.pathname, bytes);
      if (loseUploadResponse && url.pathname.endsWith('.mp4')) {
        loseUploadResponse = false;
        return json({ error: 'GatewayError', message: 'Response lost after commit' }, 503);
      }
      return json({ Key: url.pathname.replace('/storage/v1/object/', ''), Id: 'object-id' });
    }
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  };
  const client = createClient('https://import-test.supabase.co', 'sb_publishable_test', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch, headers: { Authorization: 'Bearer test-user-token' } },
  });
  return { client, state };
}

test('license, complete rights, voice review and visible Short credits are required', () => {
  assert.throws(() => validateManifest(manifest({ license: 'CC-BY-NC-4.0' })), /unsupported/);
  assert.throws(() => validateManifest(manifest({ review: { approved: true } })), /review required/);
  assert.throws(() => validateManifest(manifest({ license: 'CC-BY-4.0' })), /embedded attribution/);
  const withCredits = manifest({ license: 'CC-BY-4.0' });
  withCredits.items[0].review.embeddedAttributionConfirmed = true;
  assert.equal(validateManifest(withCredits).length, 1);
  assert.throws(() => validateManifest(manifest({ file: 'https://example.org/video.mp4' })), /local MP4/);
});

test('real media preflight handles both formats without network writes', async () => {
  const { client, state } = backend();
  const input = manifest();
  input.items.push(manifest({ file: 'long.mp4', format: 'long', title: 'Landscape test' }).items[0]);
  const result = await importBatch({ manifest: input, baseDirectory: directory, client });
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.items, 2);
  assert.ok(result.results[0].height > result.results[0].width);
  assert.ok(result.results[1].width > result.results[1].height);
  assert.equal(state.requests.length, 0);
});

test('all inputs validate before publishing: no audio, wrong orientation, duplicates, limits', async () => {
  const { client, state } = backend();
  const options = { baseDirectory: directory, publish: true, client, channelId };
  const mixed = manifest();
  mixed.items.push(manifest({ file: 'silent.mp4' }).items[0]);
  await assert.rejects(importBatch({ ...options, manifest: mixed }), /AAC audio/);
  await assert.rejects(importBatch({ ...options, manifest: manifest({ file: 'long.mp4' }) }), /portrait/);
  const duplicate = manifest();
  duplicate.items.push({ ...duplicate.items[0], title: 'Same bytes, different title' });
  await assert.rejects(importBatch({ ...options, manifest: duplicate }), /duplicate media/);
  await assert.rejects(importBatch({ ...options, manifest: manifest(), maxItems: 0 }), /integer/);
  assert.equal(state.requests.length, 0);
});

test('unapproved channels and another owner cannot publish', async () => {
  await assert.rejects(verifyDestination(backend({ approval: 'pending' }).client, channelId), /approved video channel/);
  await assert.rejects(verifyDestination(backend({ owner: 'other-owner' }).client, channelId), /approved video channel/);
});

test('publish uses existing tables, preserves bytes and credits, retries preserve real counters', async () => {
  const { client, state } = backend();
  const options = { manifest: manifest(), baseDirectory: directory, publish: true, client, channelId };
  const first = await importBatch(options);
  const id = first.results[0].id;
  assert.equal(first.results[0].status, 'published');
  const stored = state.videos.get(id);
  assert.match(stored.description, /Source: https:\/\/example.org\/fixture/);
  assert.match(stored.description, /creativecommons.org\/publicdomain\/zero\/1.0/);
  assert.equal(stored.is_short, true);
  assert.equal(stored.transcoding_status, 'ready');
  for (const field of ['views_count', 'likes_count', 'comments_count', 'trending_score', 'engagement_score', 'created_at']) {
    assert.equal(Object.hasOwn(state.inserts[0], field), false, `${field} must never be fabricated`);
  }
  const storedMedia = [...state.objects].find(([path]) => path.endsWith('.mp4'))[1];
  assert.deepEqual(storedMedia, await readFile(join(directory, 'short.mp4')));
  stored.views_count = 72;
  const repeated = await importBatch(options);
  assert.equal(repeated.results[0].status, 'already-present');
  assert.equal(stored.views_count, 72);
  assert.equal(state.objects.size, 2);
  assert.equal(state.videos.size, 1);
  assert.equal(state.qualities.size, 1);
});

test('a failed DB insert can resume from immutable storage without duplicate assets', async () => {
  const { client, state } = backend({ insertFailures: 1 });
  const options = { manifest: manifest(), baseDirectory: directory, publish: true, client, channelId };
  await assert.rejects(importBatch(options), /Video insert failed/);
  assert.equal(state.objects.size, 2);
  assert.equal(state.videos.size, 0);
  const resumed = await importBatch(options);
  assert.equal(resumed.results[0].status, 'published');
  assert.equal(state.objects.size, 2);
  assert.equal(state.videos.size, 1);
});

test('lost upload responses are reconciled by hashing the uploaded object', async () => {
  const { client, state } = backend({ loseUploadResponse: true });
  await importBatch({ manifest: manifest(), baseDirectory: directory, publish: true, client, channelId });
  assert.equal(state.videos.size, 1);
  assert.equal(state.objects.size, 2);
});

test('a partial quality registration repairs on retry without another video insert', async () => {
  const { client, state } = backend({ qualityFailures: 1 });
  const options = { manifest: manifest(), baseDirectory: directory, publish: true, client, channelId };
  await assert.rejects(importBatch(options), /quality registration failed/);
  assert.equal(state.videos.size, 1);
  assert.equal(state.qualities.size, 0);
  await importBatch(options);
  assert.equal(state.inserts.length, 1);
  assert.equal(state.qualities.size, 1);
});
