export class DocumentReadError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 422) {
    super(message);
    this.name = "DocumentReadError";
  }
}

export const MAX_DOCUMENT_CHARACTERS = 200_000;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_BYTES = 2 * 1024 * 1024;

export function checkDocumentText(text: string): string {
  if (text.length > MAX_DOCUMENT_CHARACTERS) {
    throw new DocumentReadError("DOCUMENT_TOO_LONG", "Document trop long pour Clara (200 000 caractères maximum).", 413);
  }
  return text;
}

/** Only reviewed public diagnostics cross the UI boundary; never provider text. */
export function documentDiagnostic(value: unknown): string {
  const code = value && typeof value === 'object' && 'code' in value ? value.code : undefined;
  const allowed = new Set([
    'MAIL_SCOPE_DENIED', 'MAIL_CONFIGURATION_REQUIRED', 'REGISTRY_ACCESS_DENIED',
    'AUTHENTICATED_OS_SESSION_REQUIRED', 'NATIVE_SCOPE_DENIED', 'NATIVE_AUTHORITY_UNAVAILABLE',
    'NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED', 'NATIVE_GOOGLE_SCOPE_DENIED',
    'NATIVE_GOOGLE_OWNER_SCOPE_DENIED', 'NATIVE_GOOGLE_REAUTH_REQUIRED', 'GOOGLE_REAUTH_REQUIRED',
    'NATIVE_GOOGLE_PRINCIPAL_CHANGED', 'NATIVE_GOOGLE_PRINCIPAL_UNVERIFIED',
    'NATIVE_GOOGLE_REVISION_CONFLICT', 'NATIVE_DOCUMENT_MIGRATION_REQUIRED',
    'NATIVE_DOCUMENT_SCOPE_DENIED', 'NATIVE_DOCUMENT_REVISION_CONFLICT',
    'NATIVE_DOCUMENT_GOOGLE_RIGHTS_DENIED', 'NATIVE_DOCUMENT_GOOGLE_RIGHTS_UNAVAILABLE',
    'NATIVE_DOCUMENT_MISSION_REQUIRED', 'NATIVE_DOCUMENT_CONTEXT_UNAVAILABLE',
    'GOOGLE_CONSENT_REQUIRED', 'GOOGLE_RESOURCE_DENIED', 'GOOGLE_PROVIDER_UNAVAILABLE',
    'DOCUMENT_GOOGLE_UNAVAILABLE', 'DOCUMENT_ANALYSIS_UNAVAILABLE', 'DOCUMENT_NO_TEXT',
    'DOCUMENT_TOO_LONG', 'PDF_NO_TEXT', 'PDF_INVALID', 'NATIVE_WRITE_DENIED',
  ]);
  return typeof code === 'string' && allowed.has(code) ? code : 'DOCUMENT_REQUEST_FAILED';
}
