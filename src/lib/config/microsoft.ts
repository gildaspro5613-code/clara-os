const configuredTenant = (process.env.MICROSOFT_TENANT_ID ?? "organizations").trim();

export const microsoftConfig = {
  // Clara OS connects organizational Microsoft 365 / Windows 365 accounts only.
  // "organizations" keeps the app multitenant without accepting personal Microsoft accounts.
  tenantId: configuredTenant || "organizations",
  clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
  redirectUri: process.env.MICROSOFT_REDIRECT_URI ?? "",
} as const;
