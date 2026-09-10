/**
 * ============================================
 * CLARA OS
 * Drive Search Capability
 * --------------------------------------------
 * File : result.ts
 * Responsibility :
 * Defines the result returned by the
 * Drive Search capability.
 * ============================================
 */

import type { DriveResourceEntry } from "@/lib/connectors/internal/google/drive/google-drive-result";

/**
 * Result of a Drive Search capability execution.
 */
export interface DriveSearchResult {

  /**
   * Operation status.
   */
  success: boolean;

  /**
   * Human-readable message summarising the outcome.
   */
  message: string;

  /**
   * Resources found (search / list operations).
   */
  entries?: DriveResourceEntry[];

  /**
   * Plain-text content (read operation).
   */
  textContent?: string;

  /**
   * Structured Drive context ready for injection into an LLM prompt.
   */
  driveContext?: DriveContext;

  /**
   * Completion timestamp.
   */
  completedAt: Date;

}

/**
 * Structured Drive context injected into the LLM prompt.
 */
export interface DriveContext {

  /**
   * Primary resource identifier.
   */
  id: string;

  /**
   * Display name.
   */
  name: string;

  /**
   * MIME type.
   */
  mimeType?: string;

  /**
   * Parent folder identifiers.
   */
  parents?: string[];

  /**
   * URL to open the resource in a browser.
   */
  webViewLink?: string;

  /**
   * All matching resources when multiple results were found.
   */
  matches?: Array<{
    id: string;
    name: string;
    mimeType?: string;
    webViewLink?: string;
  }>;

}
