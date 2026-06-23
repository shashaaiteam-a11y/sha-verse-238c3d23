/**
 * Reusable client-side image compressor used across ALL upload paths.
 *
 * Behaviour:
 *  - Downscales to a max long edge and re-encodes (WebP, JPEG fallback).
 *  - Skips GIF / SVG / already-small files and non-images.
 *  - SAFE NO-OP: returns the original File on any failure or if the result
 *    would not be smaller. Never throws.
 */

import {
  ENABLE_IMAGE_COMPRESSION,
  IMAGE_MAX_DIM,
  IMAGE_QUALITY,
  IMAGE_SKIP_BELOW_BYTES,
} from './config';

function canEncodeWebp(): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

export async function compressImage(file: File): Promise<File> {
  try {
    if (!ENABLE_IMAGE_COMPRESSION) return file;
    if (!file || !file.type.startsWith('image/')) return file;
    // Don't touch formats that lose data / animation when re-encoded.
    if (
      file.type === 'image/gif' ||
      file.type === 'image/svg+xml'
    ) {
      return file;
    }
    if (file.size <= IMAGE_SKIP_BELOW_BYTES) return file;
    if (typeof createImageBitmap !== 'function') return file;

    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    const scale = longest > IMAGE_MAX_DIM ? IMAGE_MAX_DIM / longest : 1;

    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const useWebp = canEncodeWebp();
    const mime = useWebp ? 'image/webp' : 'image/jpeg';
    const ext = useWebp ? '.webp' : '.jpg';

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mime, IMAGE_QUALITY)
    );
    // Bail out if encoding failed or didn't actually save space.
    if (!blob || blob.size >= file.size) return file;

    const newName =
      file.name.replace(/\.(png|jpe?g|bmp|webp|heic|heif|tiff?)$/i, '') + ext;

    // Lightweight verification log (only when it actually shrank the file),
    // so the saving is observable: e.g. "image 3204KB -> 312KB (webp)".
    try {
      const before = Math.round(file.size / 1024);
      const after = Math.round(blob.size / 1024);
      console.info(`[compress] image ${before}KB -> ${after}KB (${useWebp ? 'webp' : 'jpeg'})`);
    } catch {
      /* ignore */
    }

    return new File([blob], newName, {
      type: mime,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[compress] image compression skipped:', err);
    return file;
  }
}
