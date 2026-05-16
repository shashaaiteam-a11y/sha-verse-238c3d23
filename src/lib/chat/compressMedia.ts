/**
 * Lightweight client-side image compressor for the Chats module.
 * - Downscales to max 1600px (long edge), re-encodes as JPEG q=0.82.
 * - Skips GIF / SVG / WebP / already-small files / non-images.
 * - Safe no-op on any failure (returns original File).
 */

const MAX_DIM = 1600;
const QUALITY = 0.82;
const SKIP_BELOW_BYTES = 200 * 1024;

export async function maybeCompressImage(file: File): Promise<File> {
  try {
    if (!file.type.startsWith('image/')) return file;
    if (
      file.type === 'image/gif' ||
      file.type === 'image/svg+xml' ||
      file.type === 'image/webp'
    ) return file;
    if (file.size <= SKIP_BELOW_BYTES) return file;
    if (typeof createImageBitmap !== 'function') return file;

    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    const scale = longest > MAX_DIM ? MAX_DIM / longest : 1;

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

    const newName =
      file.name.replace(/\.(png|jpe?g|bmp|heic|heif)$/i, '') + '.jpg';
    return new File([blob], newName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[chat] image compress skipped:', err);
    return file;
  }
}
