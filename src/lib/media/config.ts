/**
 * Central configuration + feature flags for the upload compression layer.
 *
 * Why this file exists:
 *  - Single place to tune compression behaviour for the whole app.
 *  - Provides INSTANT ROLLBACK switches. If browser-side compression ever
 *    misbehaves on a device, flip the relevant flag here and the app reverts
 *    to its previous behaviour without touching any module code.
 */

/* ------------------------------------------------------------------ *
 * Master switches (rollback control)
 * ------------------------------------------------------------------ */

/** Client-side IMAGE compression before upload. */
export const ENABLE_IMAGE_COMPRESSION = true;

/** Client-side VIDEO compression (ffmpeg.wasm) before upload. */
export const ENABLE_VIDEO_COMPRESSION = true;

/**
 * Server-side additive WebP variants (`compress-image` edge function).
 * Kept OFF to minimise storage cost — browser compression already shrinks the
 * single stored file. Flip to `true` to instantly re-enable the edge function
 * trigger calls across the app (the function code is preserved either way).
 */
export const ENABLE_SERVER_COMPRESSION = false;

/* ------------------------------------------------------------------ *
 * Image tuning
 * ------------------------------------------------------------------ */

export const IMAGE_MAX_DIM = 1600; // longest edge in px
export const IMAGE_QUALITY = 0.8; // 0..1
/** Below this, images are left untouched (already small enough). */
export const IMAGE_SKIP_BELOW_BYTES = 150 * 1024; // 150 KB

/* ------------------------------------------------------------------ *
 * Video tuning + size thresholds
 * ------------------------------------------------------------------ */

const MB = 1024 * 1024;

/**
 * Videos at or below this size are uploaded as-is (no compression).
 * Compressing tiny clips wastes CPU/battery for negligible savings.
 */
export const VIDEO_COMPRESS_MIN_BYTES = 20 * MB; // 20 MB

/**
 * Above this size we still attempt compression but warn the user first,
 * because very large files can be slow or unstable to encode in-browser.
 */
export const VIDEO_WARN_ABOVE_BYTES = 500 * MB; // 500 MB

/** Cap the long edge of the video (720p-class). */
export const VIDEO_MAX_LONG_EDGE = 1280;
/** x264 CRF — higher = smaller file, lower quality. 28 is a good balance. */
export const VIDEO_CRF = 28;
