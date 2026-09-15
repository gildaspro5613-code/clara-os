/**
 * ============================================
 * CLARA OS
 * Drive Search Capability
 * --------------------------------------------
 * File : context.ts
 * Responsibility :
 * Defines the execution context for the
 * Drive Search capability.
 * ============================================
 */

/**
 * Drive search operation types.
 */
export type DriveOperation =
  | "search"
  | "list"
  | "read";

/**
 * Context for a Drive Search capability execution.
 */
export interface DriveSearchContext {

  /**
   * The operation to perform.
   */
  operation: DriveOperation;

  /**
   * Free-text query used for search operations.
   * E.g. "RTSE Angers", "Melodie Digital"
   */
  query?: string;

  /**
   * Folder identifier used for list operations.
   */
  folderId?: string;

  /**
   * File identifier used for read operations.
   */
  fileId?: string;

  /**
   * MIME type hint for read operations.
   */
  mimeType?: string;

}
