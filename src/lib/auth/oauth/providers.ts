import { brevoOAuthProvider } from "@/lib/connectors/brevo/oauth";
import { googleOAuthProvider } from "@/lib/connectors/google/oauth/google-oauth";
import { OAuthProviderRegistry } from "./registry";

export const oauthProviders = new OAuthProviderRegistry([
  googleOAuthProvider,
  brevoOAuthProvider,
]);
