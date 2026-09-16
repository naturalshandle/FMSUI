import { API_BASE_URL, ApiError, getAccessToken } from '@/lib/api';
import { extractErrorMessage } from '@/lib/errors';

/**
 * Shared multipart upload helper. The generic `request()` in api.ts forces
 * Content-Type: application/json, which breaks multipart's browser-generated
 * boundary — so uploads must bypass it and build their own fetch, same as the
 * original documentsApi.ts pattern. Reused by: Franchise Creation step 6,
 * Admin Document Replace, Salon Audit photo upload.
 */
export async function uploadMultipart<T>(
  path: string,
  formData: FormData,
  opts: { method?: string; extraHeaders?: Record<string, string> } = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = { ...opts.extraHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server to upload the file.');
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(res.status, data));
  }
  return data as T;
}
