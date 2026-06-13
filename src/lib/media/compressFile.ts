/**
 * Upload compression dispatcher.
 *
 * Use this right before any `storage.upload(...)` call:
 *
 *   const toUpload = await compressForUpload(file, { onProgress, onLargeFileWarning });
 *   await supabase.storage.from(bucket).upload(path, toUpload);
 *
 *  - image/*  -> client-side image compression (WebP/JPEG)
 *  - video/*  -> ffmpeg.wasm video compression (size-thresholded)
 *  - anything else (PDF, EPUB, docs) -> returned unchanged (safe)
 *
 * ALWAYS safe: returns the original File on any failure. Never throws.
 *
 * NOTE: the file's name/extension/mime may change after compression, so
 * derive the storage path/contentType from the RETURNED file, not the input.
 */

import { compressImage } from './compressImage';
import { compressVideo, type CompressVideoOptions } from './compressVideo';

export { compressImage } from './compressImage';
export { compressVideo, type CompressVideoOptions } from './compressVideo';

export async function compressForUpload(
  file: File,
  options: CompressVideoOptions = {},
): Promise<File> {
  try {
    if (!file) return file;
    if (file.type.startsWith('image/')) return await compressImage(file);
    if (file.type.startsWith('video/')) return await compressVideo(file, options);
    return file;
  } catch (err) {
    console.warn('[compress] dispatch skipped:', err);
    return file;
  }
}
