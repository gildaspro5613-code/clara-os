/**
 * ============================================
 * CLARA OS
 * Read Document Capability
 * --------------------------------------------
 * Responsibility :
 * Reads the content of a Google Document.
 * ============================================
 */

export const READ_DOCUMENT_CAPABILITY =
  "read-document";

export interface ReadDocumentCapability {

  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly category: string;

}

export const ReadDocumentCapabilityDefinition:
  ReadDocumentCapability = {

  id:
    READ_DOCUMENT_CAPABILITY,

  name:
    "Read Document",

  description:
    "Reads the content of a Google Document.",

  version:
    "1.0.0",

  category:
    "Workspace",

};
