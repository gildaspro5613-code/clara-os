/**
 * ============================================
 * CLARA OS
 * Google Docs Client
 * --------------------------------------------
 * File : docs-client.ts
 * Responsibility :
 * Creates the authenticated
 * Google Docs SDK client and
 * shared Google Docs helpers.
 * ============================================
 */

import { google } from "googleapis";
import type { docs_v1 } from "googleapis";

import { GoogleAuth } from "@/lib/connectors/internal/google/auth/google-auth";

/**
 * Supported units for Google Docs dimensions.
 */
export type DocumentDimensionUnit = "PT" | "IN" | "CM" | "MM";

/**
 * Shared insertion target for Google Docs requests.
 */
export interface DocumentInsertionTarget {

  /**
   * Absolute insertion location in the target segment.
   */
  location?: docs_v1.Schema$Location;

  /**
   * Insertion target at the end of a segment.
   */
  endOfSegmentLocation?: docs_v1.Schema$EndOfSegmentLocation;

}

/**
 * Google Docs client factory.
 */
export class DocsClient {

  /**
   * Creates an authenticated Google Docs client.
   */
  public async create(): Promise<docs_v1.Docs> {

    return google.docs({

      version: "v1",

      auth: await new GoogleAuth().createClient(),

    });

  }

}

/**
 * Validates and normalizes a required string.
 */
export function assertNonEmptyString(
  value: string,
  fieldName: string,
  operation: string,
): string {

  const normalizedValue = value.trim();

  if (!normalizedValue) {

    throw new Error(`${operation}: ${fieldName} must not be empty.`);

  }

  return normalizedValue;

}

/**
 * Validates and normalizes a Google Docs document identifier.
 */
export function assertDocumentId(
  documentId: string,
  operation: string,
): string {

  return assertNonEmptyString(documentId, "documentId", operation);

}

/**
 * Validates an array of Google Docs tab identifiers.
 */
export function normalizeTabIds(
  tabIds: string[] | undefined,
  operation: string,
): string[] | undefined {

  if (tabIds === undefined) {

    return undefined;

  }

  if (tabIds.length === 0) {

    throw new Error(`${operation}: tabIds must contain at least one entry.`);

  }

  return tabIds.map((tabId, index) => {

    const normalizedTabId = tabId.trim();

    if (!normalizedTabId) {

      throw new Error(`${operation}: tabIds[${index}] must not be empty.`);

    }

    return normalizedTabId;

  });

}

/**
 * Builds Google Docs tabs criteria from optional tab identifiers.
 */
export function createTabsCriteria(
  tabIds: string[] | undefined,
  operation: string,
): docs_v1.Schema$TabsCriteria | undefined {

  const normalizedTabIds = normalizeTabIds(tabIds, operation);

  return normalizedTabIds === undefined
    ? undefined
    : {
      tabIds: normalizedTabIds,
    };

}

/**
 * Validates a write control object when provided.
 */
export function normalizeWriteControl(
  writeControl: docs_v1.Schema$WriteControl | undefined,
  operation: string,
): docs_v1.Schema$WriteControl | undefined {

  if (writeControl === undefined) {

    return undefined;

  }

  const requiredRevisionId =
    writeControl.requiredRevisionId == null
      ? undefined
      : assertNonEmptyString(
        writeControl.requiredRevisionId,
        "writeControl.requiredRevisionId",
        operation,
      );

  const targetRevisionId =
    writeControl.targetRevisionId == null
      ? undefined
      : assertNonEmptyString(
        writeControl.targetRevisionId,
        "writeControl.targetRevisionId",
        operation,
      );

  return {

    requiredRevisionId,

    targetRevisionId,

  };

}

/**
 * Validates and resolves a Google Docs insertion target.
 */
export function resolveInsertionTarget(
  target: DocumentInsertionTarget,
  operation: string,
): Pick<docs_v1.Schema$InsertTextRequest, "location" | "endOfSegmentLocation"> {

  if (target.location !== undefined && target.endOfSegmentLocation !== undefined) {

    throw new Error(
      `${operation}: provide either location or endOfSegmentLocation, but not both.`,
    );

  }

  if (target.location !== undefined) {

    return {
      location: normalizeLocation(target.location, operation),
    };

  }

  if (target.endOfSegmentLocation !== undefined) {

    return {
      endOfSegmentLocation: normalizeEndOfSegmentLocation(
        target.endOfSegmentLocation,
        operation,
      ),
    };

  }

  return {
    endOfSegmentLocation: {},
  };

}

/**
 * Validates a positive finite number.
 */
export function assertPositiveNumber(
  value: number,
  fieldName: string,
  operation: string,
): void {

  if (!Number.isFinite(value) || value <= 0) {

    throw new Error(`${operation}: ${fieldName} must be a positive number.`);

  }

}

/**
 * Validates a positive integer.
 */
export function assertPositiveInteger(
  value: number,
  fieldName: string,
  operation: string,
): void {

  if (!Number.isInteger(value) || value <= 0) {

    throw new Error(`${operation}: ${fieldName} must be a positive integer.`);

  }

}

/**
 * Builds the canonical editor URL of a Google Document.
 */
export function buildDocumentUrl(documentId: string): string {

  return `https://docs.google.com/document/d/${documentId}/edit`;

}

/**
 * Validates a standard Google Docs location.
 */
function normalizeLocation(
  location: docs_v1.Schema$Location,
  operation: string,
): docs_v1.Schema$Location {

  const index = location.index;

  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {

    throw new Error(`${operation}: location.index must be a non-negative integer.`);

  }

  return {

    index,

    segmentId:
      location.segmentId == null
        ? undefined
        : assertNonEmptyString(location.segmentId, "location.segmentId", operation),

    tabId:
      location.tabId == null
        ? undefined
        : assertNonEmptyString(location.tabId, "location.tabId", operation),

  };

}

/**
 * Validates an end-of-segment insertion target.
 */
function normalizeEndOfSegmentLocation(
  location: docs_v1.Schema$EndOfSegmentLocation,
  operation: string,
): docs_v1.Schema$EndOfSegmentLocation {

  return {

    segmentId:
      location.segmentId == null
        ? undefined
        : assertNonEmptyString(
          location.segmentId,
          "endOfSegmentLocation.segmentId",
          operation,
        ),

    tabId:
      location.tabId == null
        ? undefined
        : assertNonEmptyString(
          location.tabId,
          "endOfSegmentLocation.tabId",
          operation,
        ),

  };

}
