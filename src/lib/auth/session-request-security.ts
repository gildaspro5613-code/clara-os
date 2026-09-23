/**
 * Same-origin guard for cookie-authenticated state-changing requests.
 * Never derive the expected origin from untrusted forwarded headers.
 */
export function isSameOriginRequest(requestOrigin: string | null, configuredAppOrigin: string | undefined): boolean {
  if (!requestOrigin || !configuredAppOrigin) return false;
  try {
    const actual = new URL(requestOrigin);
    const expected = new URL(configuredAppOrigin);
    return actual.origin === expected.origin
      && actual.protocol === "https:"
      && actual.pathname === "/"
      && expected.protocol === "https:";
  } catch {
    return false;
  }
}
