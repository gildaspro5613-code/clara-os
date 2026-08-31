import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { googleConfig } from "@/lib/config/google";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
] as const;

export function createGoogleOAuthClient() {
  if (!googleConfig.clientId || !googleConfig.clientSecret || !googleConfig.redirectUri) {
    throw new Error("Google OAuth server configuration is incomplete.");
  }
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirectUri,
  );
}

export function mergeGoogleCredentials(
  current: Credentials | null,
  update: Credentials,
): Credentials {
  return {
    ...(current ?? {}),
    ...update,
    refresh_token: update.refresh_token ?? current?.refresh_token,
  };
}
