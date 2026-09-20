import { brevoOAuthProvider } from "@/lib/connectors/brevo/oauth";
import { googleOAuthProvider } from "@/lib/connectors/google/oauth/google-oauth";
import { microsoftOAuthProvider } from "@/lib/connectors/microsoft/oauth/microsoft-oauth";
import { OAuthProviderRegistry } from "./registry";

export const oauthProviders = new OAuthProviderRegistry([
  googleOAuthProvider,
  brevoOAuthProvider,
  microsoftOAuthProvider,
]);
