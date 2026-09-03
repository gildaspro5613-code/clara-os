import { createOAuthNonce, signOAuthState, verifyOAuthState } from "@/lib/auth/oauth/state";

export interface GoogleOAuthState {
  connectionId: string;
  workspaceId: string;
  nonce: string;
  expiresAt: number;
}

function stateSecret(): string {
  const secret = process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("CLARA_CREDENTIALS_ENCRYPTION_KEY is not configured.");
  }
  return secret;
}

export function createGoogleOAuthNonce(): string {
  return createOAuthNonce();
}

export function signGoogleOAuthState(
  state: GoogleOAuthState,
  secret = stateSecret(),
): string {
  return signOAuthState({ ...state, provider: "google", redirectPath: "/?google=connected" }, secret);
}

export function verifyGoogleOAuthState(
  value: string,
  expectedNonce: string,
  secret = stateSecret(),
  now = Date.now(),
): GoogleOAuthState | null {
  try {
    const state = verifyOAuthState(value, { nonce: expectedNonce, provider: "google" }, secret, now);
    return {
      connectionId: state.connectionId, workspaceId: state.workspaceId,
      nonce: state.nonce, expiresAt: state.expiresAt,
    };
  } catch {
    return null;
  }
}
