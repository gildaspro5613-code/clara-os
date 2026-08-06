/**
 * ============================================
 * CLARA OS
 * Google Docs – Replace Text
 * --------------------------------------------
 * File : replace-text.ts
 * Responsibility :
 * Replaces matching text in a
 * Google document.
 * ============================================
 */

import type { docs_v1 } from "googleapis";

import { assertDocumentId, assertNonEmptyString, createTabsCriteria } from "./docs-client";
import { updateDocument } from "./update-document";

/**
 * Options for replacing text in a Google document.
 */
export interface ReplaceTextOptions {

  /**
   * Document identifier.
   */
  documentId: string;

  /**
   * Search string or regular expression pattern.
   */
  searchText: string;

  /**
   * Replacement text.
   */
  replaceText: string;

  /**
   * Whether matching should be case sensitive.
   */
  matchCase?: boolean;

  /**
   * Whether `searchText` should be interpreted as a regular expression.
   */
  searchByRegex?: boolean;

  /**
   * Optional list of tab identifiers to scope the replacement to.
   */
  tabIds?: string[];

  /**
   * Optional write coordination options.
   */
  writeControl?: docs_v1.Schema$WriteControl;

}

/**
 * Text replacement summary.
 */
export interface ReplaceTextResult {

  /**
   * Identifier of the updated document.
   */
  documentId: string;

  /**
   * Number of occurrences that were replaced.
   */
  occurrencesChanged: number;

  /**
   * Updated write control returned by the Google Docs API.
   */
  writeControl?: docs_v1.Schema$WriteControl;

}

/**
 * Replaces matching text in a Google document.
 *
 * Uses {@link updateDocument} to execute a Docs API v1 `ReplaceAllTextRequest`.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Document identifier and replacement criteria.
 * @returns A summary containing the number of replacements.
 * @throws {Error} When `documentId` or `searchText` is empty.
 */
export async function replaceText(
  options: ReplaceTextOptions,
): Promise<ReplaceTextResult> {

  const documentId = assertDocumentId(options.documentId, "replaceText");
  const searchText = assertNonEmptyString(options.searchText, "searchText", "replaceText");

  const response = await updateDocument({

    documentId,

    requests: [
      {
        replaceAllText: {
          containsText: {
            text: searchText,
            matchCase: options.matchCase,
            searchByRegex: options.searchByRegex,
          },
          replaceText: options.replaceText,
          tabsCriteria: createTabsCriteria(options.tabIds, "replaceText"),
        },
      },
    ],

    writeControl: options.writeControl,

  });

  return {

    documentId: response.documentId ?? documentId,

    occurrencesChanged:
      response.replies?.[0]?.replaceAllText?.occurrencesChanged ?? 0,

    writeControl: response.writeControl ?? undefined,

  };

}
