export type OAuthErrorCode =
  | "UNSUPPORTED_PROVIDER"
  | "INVALID_STATE"
  | "EXPIRED_STATE"
  | "PROVIDER_MISMATCH"
  | "CONNECTION_MISMATCH"
  | "MISSING_AUTHORIZATION_CODE"
  | "CODE_EXCHANGE_FAILED"
  | "REFRESH_UNAVAILABLE"
  | "REFRESH_FAILED"
  | "INVALID_GRANT"
  | "CREDENTIALS_MISSING";

/** A deliberately credential-free error safe for logs and public mapping. */
export class OAuthError extends Error {
  constructor(public readonly code: OAuthErrorCode) {
    super(code);
    this.name = "OAuthError";
  }

  toJSON() {
    return { name: this.name, code: this.code, message: this.message };
  }
}

export function isInvalidGrant(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; message?: string; response?: { data?: { error?: string } } };
  return value.code === "invalid_grant" ||
    value.response?.data?.error === "invalid_grant" ||
    value.message === "invalid_grant";
}
