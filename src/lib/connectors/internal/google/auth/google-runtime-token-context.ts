import { AsyncLocalStorage } from "node:async_hooks";

interface GoogleRuntimeTokenContextValue {
  organizationId: string;
  accessToken: string;
}

const storage = new AsyncLocalStorage<GoogleRuntimeTokenContextValue>();

/**
 * Runs one Google connector operation with an organization-scoped short-lived
 * access token. The token is kept in async runtime context only and must never
 * be copied into Brain, Mission, Journal or PostgreSQL state.
 */
export function runWithGoogleRuntimeToken<T>(
  value: GoogleRuntimeTokenContextValue,
  operation: () => Promise<T>,
): Promise<T> {
  return storage.run(value, operation);
}

/** Returns the short-lived token bound to the current Google connector call. */
export function getGoogleRuntimeAccessToken(): string | undefined {
  return storage.getStore()?.accessToken;
}
