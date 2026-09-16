import { request } from '@/lib/api';

export interface StepUpToken {
  stepUpToken: string;
  expiresInSeconds: number;
}

/** POST /api/v1/step-up/verify — Bearer = normal access token, any authenticated
 * role. Per spec §0.2.8, never cache the returned token across actions — always
 * re-request a fresh one immediately before each sensitive call. */
export async function requestStepUp(code: string): Promise<StepUpToken> {
  return request<StepUpToken>('/step-up/verify', { method: 'POST', body: { code } });
}

export const STEP_UP_HEADER = 'X-Step-Up-Token';

/** Wraps request() to send the step-up token as the separate X-Step-Up-Token
 * header (never merged into Authorization) for sensitive-info endpoints. */
export async function requestWithStepUp<T>(
  path: string,
  stepUpToken: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  return request<T>(path, { ...options, extraHeaders: { [STEP_UP_HEADER]: stepUpToken } });
}

/** True when the error message indicates the step-up token is missing/expired/
 * mismatched — callers should silently re-trigger the step-up prompt rather than
 * surfacing a raw error for these two specific messages. */
export function isStepUpRequiredError(message: string): boolean {
  return (
    message === 'A valid step-up token is required' || message === 'Step-up token does not belong to the caller'
  );
}
