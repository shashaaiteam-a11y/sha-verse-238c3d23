import { describe, it, expect } from 'vitest';

/**
 * Mirrors the storage RLS WITH CHECK expression for the `chat-media`
 * INSERT policy:
 *
 *   bucket_id = 'chat-media'
 *   AND (auth.uid())::text = (storage.foldername(name))[1]
 *
 * `storage.foldername(name)` returns the path segments of the object key
 * EXCLUDING the final filename. So for `${uid}/conv-1/file.png` the first
 * segment is `${uid}`. We replicate that here and verify the path-ownership
 * check denies any object whose first folder is not the caller's user id.
 */
function firstFolder(name: string): string | null {
  const parts = name.split('/');
  if (parts.length < 2) return null; // no folder, only a filename
  return parts[0] ?? null;
}

function isAllowed(uploaderId: string, objectName: string): boolean {
  return firstFolder(objectName) === uploaderId;
}

describe('chat-media path-ownership RLS check', () => {
  const me = '11111111-1111-1111-1111-111111111111';
  const someoneElse = '22222222-2222-2222-2222-222222222222';

  it('allows upload into own folder', () => {
    expect(isAllowed(me, `${me}/conv-1/photo.jpg`)).toBe(true);
    expect(isAllowed(me, `${me}/voice/clip.m4a`)).toBe(true);
  });

  it('denies upload into another user folder', () => {
    expect(isAllowed(me, `${someoneElse}/conv-1/photo.jpg`)).toBe(false);
  });

  it('denies upload at the bucket root (no folder)', () => {
    expect(isAllowed(me, 'photo.jpg')).toBe(false);
  });

  it('denies upload into a non-uuid folder', () => {
    expect(isAllowed(me, 'public/photo.jpg')).toBe(false);
    expect(isAllowed(me, 'admin/photo.jpg')).toBe(false);
  });

  it('denies attempts to escape via leading slash', () => {
    // leading slash makes first segment empty
    expect(isAllowed(me, `/${me}/photo.jpg`)).toBe(false);
  });
});
