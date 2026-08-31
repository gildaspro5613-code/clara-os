export const GOOGLE_REAUTH_REQUIRED = "GOOGLE_REAUTH_REQUIRED" as const;

export class GoogleReauthRequiredError extends Error {
  readonly code = GOOGLE_REAUTH_REQUIRED;

  constructor() {
    super("Google authorization is no longer valid. Reconnect Google.");
    this.name = "GoogleReauthRequiredError";
  }
}

export function isGoogleInvalidGrant(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    message?: string;
    response?: { data?: { error?: string } };
    errors?: Array<{ reason?: string }>;
  };
  return candidate.response?.data?.error === "invalid_grant" ||
    candidate.errors?.some((item) => item.reason === "invalid_grant") === true ||
    candidate.message?.includes("invalid_grant") === true;
}
