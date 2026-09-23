export const microsoftConfig = {
  tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
  clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
  redirectUri: process.env.MICROSOFT_REDIRECT_URI ?? "",
} as const;
