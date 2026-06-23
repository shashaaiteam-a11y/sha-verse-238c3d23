/**
 * Shared Supabase Storage uploader WITH real upload-progress events.
 *
 * Why this exists:
 *  - `supabase.storage.from(bucket).upload(...)` does NOT expose upload
 *    progress, so any "uploading %" UI is impossible with it.
 *  - This helper uploads via XHR to the Storage REST endpoint, which DOES
 *    emit `progress` events, so callers can show a live percentage again.
 *
 * It mirrors the path convention used across the app:
 *   `<userId>/<folder><timestamp>-<rand>.<ext>`
 * so existing RLS policies (auth.uid()::text = foldername[1]) keep working.
 *
 * SAFE: throws on failure like a normal upload would; callers handle errors.
 */

import { supabase } from '@/integrations/supabase/client';

export interface UploadWithProgressParams {
  bucket: string;
  file: File;
  userId: string;
  /** Optional sub-folder, e.g. 'covers/'. Must end with '/' if provided. */
  folder?: string;
  /** Provide a full path (relative to bucket) to override the generated one. */
  path?: string;
  upsert?: boolean;
  /** 0..100 upload progress. */
  onProgress?: (pct: number) => void;
}

export interface UploadWithProgressResult {
  path: string;
  publicUrl: string;
}

export async function uploadWithProgress({
  bucket,
  file,
  userId,
  folder = '',
  path,
  upsert = false,
  onProgress,
}: UploadWithProgressParams): Promise<UploadWithProgressResult> {
  const ext = file.name.split('.').pop();
  const finalPath =
    path ||
    `${userId}/${folder}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const sb = supabase as any;
  const baseUrl: string =
    sb.supabaseUrl ?? 'https://plmhjuqedtkiffzhberf.supabase.co';
  const endpoint = `${baseUrl}/storage/v1/object/${bucket}/${finalPath}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', upsert ? 'true' : 'false');
    if (file.type) xhr.setRequestHeader('cache-control', '3600');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        let msg = xhr.statusText;
        try {
          msg = JSON.parse(xhr.responseText)?.message ?? msg;
        } catch {
          /* ignore */
        }
        reject(new Error(msg || 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));

    const fd = new FormData();
    fd.append('', file, finalPath.split('/').pop());
    xhr.send(fd);
  });

  const { data } = supabase.storage.from(bucket).getPublicUrl(finalPath);
  return { path: finalPath, publicUrl: data.publicUrl };
}
