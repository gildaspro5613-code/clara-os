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
