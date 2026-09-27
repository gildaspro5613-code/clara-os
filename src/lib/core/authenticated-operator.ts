/**
 * Server-side identity boundary for operators allowed to approve physical actions.
 *
 * This module deliberately does not invent authentication. A future auth/session
 * adapter must provide this value from a trusted server-side source.
 */
export interface AuthenticatedOperator {
  id: string;
  authenticationSource: string;
  authenticatedAt: Date;
}

export function requireAuthenticatedOperator(
  value: AuthenticatedOperator | null | undefined,
): AuthenticatedOperator {
  if (!value) throw new Error("authenticated operator is required");
  if (!value.id.trim()) throw new Error("authenticated operator id is required");
  if (!value.authenticationSource.trim()) {
    throw new Error("operator authentication source is required");
  }
  if (
    !(value.authenticatedAt instanceof Date) ||
    Number.isNaN(value.authenticatedAt.getTime())
  ) {
    throw new Error("valid operator authentication timestamp is required");
  }
  return value;
}
