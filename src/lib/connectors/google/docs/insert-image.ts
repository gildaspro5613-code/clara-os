/**
 * ============================================
 * CLARA OS
 * Google Docs – Insert Image
 * --------------------------------------------
 * File : insert-image.ts
 * Responsibility :
 * Inserts an inline image into
 * a Google document by URL.
 * ============================================
 */

import type { docs_v1 } from "googleapis";

import {
  assertDocumentId,
  assertNonEmptyString,
  assertPositiveNumber,
  type DocumentDimensionUnit,
  type DocumentInsertionTarget,
  resolveInsertionTarget,
} from "./docs-client";
import { updateDocument } from "./update-document";

/**
 * Options for inserting an inline image into a Google document.
 */
export interface InsertImageOptions extends DocumentInsertionTarget {

  /**
   * Document identifier.
   */
  documentId: string;

  /**
   * Publicly accessible image URL.
   */
  uri: string;

  /**
   * Requested width magnitude.
   */
  width?: number;

  /**
   * Requested height magnitude.
   */
  height?: number;

  /**
   * Unit used for width and height. Defaults to `PT`.
   */
  unit?: DocumentDimensionUnit;

  /**
   * Optional write coordination options.
   */
  writeControl?: docs_v1.Schema$WriteControl;

}

/**
 * Insert image result.
 */
export interface InsertImageResult {

  /**
   * Identifier of the updated document.
   */
  documentId: string;

  /**
   * Identifier of the created inline object.
   */
  objectId?: string;

  /**
   * Updated write control returned by the Google Docs API.
   */
  writeControl?: docs_v1.Schema$WriteControl;

}

/**
 * Inserts an inline image into a Google document.
 *
 * Uses {@link updateDocument} to execute a Docs API v1
 * `InsertInlineImageRequest`. Errors thrown by the API are propagated
 * unchanged.
 *
 * @param options - Document identifier, image URL, target location, and size.
 * @returns A summary including the created inline object identifier.
 * @throws {Error} When `documentId` or `uri` is empty.
 * @throws {Error} When the image URL is invalid or dimensions are invalid.
 */
export async function insertImage(
  options: InsertImageOptions,
): Promise<InsertImageResult> {

  const documentId = assertDocumentId(options.documentId, "insertImage");
  const uri = assertNonEmptyString(options.uri, "uri", "insertImage");

  const parsedUri = new URL(uri);

  if (parsedUri.protocol !== "http:" && parsedUri.protocol !== "https:") {

    throw new Error("insertImage: uri must use the http or https protocol.");

  }

  const objectSize = buildObjectSize(options);

  const response = await updateDocument({

    documentId,

    requests: [
      {
        insertInlineImage: {
          uri: parsedUri.toString(),
          objectSize,
          ...resolveInsertionTarget(options, "insertImage"),
        },
      },
    ],

    writeControl: options.writeControl,

  });

  return {

    documentId: response.documentId ?? documentId,

    objectId: response.replies?.[0]?.insertInlineImage?.objectId ?? undefined,

    writeControl: response.writeControl,

  };

}

/**
 * Builds an optional Google Docs object size.
 */
function buildObjectSize(
  options: InsertImageOptions,
): docs_v1.Schema$Size | undefined {

  if (options.width === undefined && options.height === undefined) {

    return undefined;

  }

  const unit = options.unit ?? "PT";

  if (options.width !== undefined) {

    assertPositiveNumber(options.width, "width", "insertImage");

  }

  if (options.height !== undefined) {

    assertPositiveNumber(options.height, "height", "insertImage");

  }

  return {

    width:
      options.width === undefined
        ? undefined
        : {
          magnitude: options.width,
          unit,
        },

    height:
      options.height === undefined
        ? undefined
        : {
          magnitude: options.height,
          unit,
        },

  };

}
