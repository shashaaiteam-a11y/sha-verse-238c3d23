/**
 * Client-side VIDEO compressor using ffmpeg.wasm (single-thread core).
 *
 * Design rules (do not change without care):
 *  - LAZY: ffmpeg core (~30MB) is only fetched the first time a video is
 *    actually compressed, so it never affects initial app load.
 *  - SINGLE-THREAD CORE: avoids the need for SharedArrayBuffer / COOP-COEP
 *    headers, so it works in Lovable preview, published site, and the
 *    Capacitor Android WebView.
 *  - SIZE THRESHOLDS: small videos are uploaded as-is (see config).
 *  - SAFE FALLBACK: on ANY failure (load error, weak device, OOM) the
 *    original File is returned. Compression must never block an upload.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import {
  ENABLE_VIDEO_COMPRESSION,
  VIDEO_COMPRESS_MIN_BYTES,
  VIDEO_WARN_ABOVE_BYTES,
  VIDEO_MAX_LONG_EDGE,
  VIDEO_CRF,
} from './config';

// Single-thread core (no SharedArrayBuffer requirement).
const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg | null> | null = null;

async function getFFmpeg(): Promise<FFmpeg | null> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const ff = new FFmpeg();
      await ff.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegInstance = ff;
      return ff;
    } catch (err) {
      console.warn('[compress] ffmpeg load failed, videos upload uncompressed:', err);
      loadPromise = null;
      return null;
    }
  })();

  return loadPromise;
}

export interface CompressVideoOptions {
  /** Called with 0..1 progress while encoding (optional). */
  onProgress?: (ratio: number) => void;
  /** Called once if the file is large enough to warrant a slow-encode warning. */
  onLargeFileWarning?: (sizeBytes: number) => void;
}

export async function compressVideo(
  file: File,
  options: CompressVideoOptions = {},
): Promise<File> {
  try {
    if (!ENABLE_VIDEO_COMPRESSION) return file;
    if (!file || !file.type.startsWith('video/')) return file;

    // Threshold: small videos are not worth compressing.
    if (file.size <= VIDEO_COMPRESS_MIN_BYTES) return file;

    // Very large files: warn but still attempt.
    if (file.size > VIDEO_WARN_ABOVE_BYTES) {
      try {
        options.onLargeFileWarning?.(file.size);
      } catch {
        /* ignore */
      }
    }

    const ff = await getFFmpeg();
    if (!ff) return file;

    if (options.onProgress) {
      ff.on('progress', ({ progress }) => {
        if (typeof progress === 'number' && progress >= 0 && progress <= 1) {
          options.onProgress?.(progress);
        }
      });
    }

    const inputName = 'input_' + Date.now();
    const outputName = 'output_' + Date.now() + '.mp4';

    await ff.writeFile(inputName, await fetchFile(file));

    // Cap the long edge to VIDEO_MAX_LONG_EDGE while keeping aspect ratio.
    // Landscape -> width capped; portrait -> height capped. -2 keeps the
    // other dimension even (required by H.264).
    const L = VIDEO_MAX_LONG_EDGE;
    const vf = `scale='if(gt(iw,ih),min(${L},iw),-2)':'if(gt(iw,ih),-2,min(${L},ih))'`;

    await ff.exec([
      '-i', inputName,
      '-vf', vf,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', String(VIDEO_CRF),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ]);

    const data = await ff.readFile(outputName);

    // Cleanup FS (best-effort).
    try {
      await ff.deleteFile(inputName);
      await ff.deleteFile(outputName);
    } catch {
      /* ignore */
    }

    const bytes = data instanceof Uint8Array ? data : new Uint8Array();
    if (!bytes.byteLength) return file;

    const blob = new Blob([bytes], { type: 'video/mp4' });
    // Only use the compressed file if it's actually smaller.
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/i, '') + '.mp4';
    return new File([blob], newName, {
      type: 'video/mp4',
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[compress] video compression skipped:', err);
    return file;
  }
}
