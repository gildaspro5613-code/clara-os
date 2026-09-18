export function createBrevoOAuthNonce(): string {
  return crypto.randomUUID();
}
