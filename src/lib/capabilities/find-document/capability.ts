/**
 * ============================================
 * CLARA OS
 * Find Document Capability
 * --------------------------------------------
 * Responsibility :
 * Finds a Google Document in the workspace Drive.
 * ============================================
 */

export const FIND_DOCUMENT_CAPABILITY =
  "find-document";

export interface FindDocumentCapability {

  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly category: string;

}

export const FindDocumentCapabilityDefinition:
  FindDocumentCapability = {

  id:
    FIND_DOCUMENT_CAPABILITY,

  name:
    "Find Document",

  description:
    "Finds a Google Document by name in Google Drive.",

  version:
    "1.0.0",

  category:
    "Workspace",

};
