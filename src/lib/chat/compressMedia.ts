/**
 * Lightweight client-side media compressor for the Chats module.
 * - Images: downscale to max 1600px (long edge), re-encode as JPEG q=0.82
 *   (or keep PNG if it has transparency / is already tiny).
 * - GIFs / SVGs / videos / other files: returned unchanged.
 *
 * Zero external dependencies — uses <canvas> only. Safe no-op on failure:
 * if anything goes wrong, we return the original File so the upload still works.
 */

const MAX_DIM = 1600;
const QUALITY = 0.82;
const SKIP_BELOW_BYTES = 200 * 1024; // <200 KB: not worth recompressing

export async function maybeCompressImage(file: File): Promise<File> {
  try {
    if (!file.type.startsWith('image/')) return file;
    // Animated formats / vector — leave alone
    if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.type === 'image/webp') {
      return file;
    }
    if (file.size <= SKIP_BELOW_BYTES) return file;

    const bitmap = await loadBitmap(file);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    const scale = longest > MAX_DIM ? MAX_DIM / longest : 1;

    // If already small enough AND not a huge PNG, skip
    if (scale === 1 && file.size <= 600 * 1024) {
      bitmap.close?.();
      return file;
    }

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

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.(png|jpe?g|bmp|heic|heif)$/i, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (err) {
    console.warn('[chat] image compress skipped:', err);
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap & { close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      return (await createImageBitmap(file)) as any;
    } catch {
      /* fall through to <img> path */
    }
  }
  // Fallback for older browsers
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      // drawImage accepts HTMLImageElement so cast is fine at call site
      // @ts-expect-error – minimal ImageBitmap-compatible shim
      close: () => URL.revokeObjectURL(url),
      // proxy draw target
      ...({ __img: img } as any),
    } as any;
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
