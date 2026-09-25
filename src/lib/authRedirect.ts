/** RequireAuth sends signed-out visitors to /login with `state.from` set to the page
 * they asked for (e.g. /agreements/42 from a reminder email). Login and both MFA
 * screens forward that state and return the user there once signed in. */
export interface AuthRedirectState {
  from?: { pathname?: string; search?: string; hash?: string };
}

export function getPostLoginPath(state: unknown): string {
  const from = (state as AuthRedirectState | null)?.from;
  const pathname = from?.pathname;
  // Only same-app paths; "//host" would be protocol-relative.
  if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//') || pathname === '/login') return '/';
  return `${pathname}${from?.search ?? ''}${from?.hash ?? ''}`;
}

/** State to pass along when moving between login → MFA verify → MFA setup. */
export function forwardAuthRedirect(state: unknown): AuthRedirectState | undefined {
  const from = (state as AuthRedirectState | null)?.from;
  return from ? { from } : undefined;
}
