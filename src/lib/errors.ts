/**
 * Implements the three error-envelope shapes from spec §0.3:
 *  1. Standard ApiErrorResponse: { message, timestamp }
 *  2. 429 rate-limit: { message } only, no timestamp — same read path since only
 *     `message` is consumed.
 *  3. Raw Spring default body (malformed multipart parts, enum binding failures,
 *     unauthenticated requests with no valid Authorization header) — no `message`
 *     key at all. Falls back to a generic string rather than crashing on `undefined`.
 */
export function extractErrorMessage(status: number, data: unknown): string {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.length > 0) return obj.message;
    if (typeof obj.error === 'string' && obj.error.length > 0) return obj.error;
    if (Array.isArray(obj.errors)) return obj.errors.join('; ');
  }
  return `Request failed (HTTP ${status})`;
}

/**
 * Bean-validation failures return the standard envelope with `message` =
 * "<fieldName>: <constraint message>" for only the FIRST field error — there is
 * no multi-field error list. Splits on the first ": " so callers can route the
 * result into a specific form field's `error` prop, falling back to showing the
 * whole message as a top-level error when the prefix doesn't match a known field.
 */
export function parseFieldError(message: string): { field: string; message: string } | null {
  const idx = message.indexOf(': ');
  if (idx === -1) return null;
  const field = message.slice(0, idx).trim();
  // Guard against colons that appear inside a normal sentence (e.g. a URL or a
  // ratio) — field names in this backend are short, unspaced identifiers.
  if (!/^[a-zA-Z0-9_.[\]]+$/.test(field) || field.length > 40) return null;
  return { field, message: message.slice(idx + 2).trim() };
}
