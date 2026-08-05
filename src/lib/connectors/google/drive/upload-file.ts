/**
 * ============================================
 * CLARA OS
 * Google Drive – Upload File
 * --------------------------------------------
 * File : upload-file.ts
 * Responsibility :
 * Uploads a file to Google Drive and
 * returns its metadata.
 * ============================================
 */

import type { Readable } from "stream";

import { DriveClient } from "./drive-client";

/**
 * Options for uploading a file to Google Drive.
 */
export interface UploadFileOptions {

  /**
   * Display name of the file in Drive.
   */
  name: string;

  /**
   * MIME type of the file content (e.g. `"application/pdf"`).
   */
  mimeType: string;

  /**
   * File content as a readable stream or a buffer.
   */
  content: Readable | Buffer;

  /**
   * Identifier of the parent folder.
   * When omitted the file is placed in My Drive root.
   */
  parentId?: string;

}

/**
 * Metadata returned after a file has been uploaded.
 */
export interface DriveUploadedFile {

  /**
   * Unique file identifier.
   */
  id: string;

  /**
   * Display name of the file.
   */
  name: string;

  /**
   * MIME type of the uploaded file.
   */
  mimeType: string;

  /**
   * URL to open the file in a browser.
   */
  webViewLink?: string;

  /**
   * RFC 3339 timestamp of creation.
   */
  createdTime?: string;

  /**
   * File size in bytes.
   */
  size?: string;

}

/**
 * Uploads a file to Google Drive.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates the upload to the Drive API v3 `files.create` endpoint with
 * multipart media upload. Errors thrown by the API are propagated to the
 * caller unchanged.
 *
 * @param options - File name, MIME type, content, and optional parent folder.
 * @returns Metadata of the newly uploaded file.
 *
 * @example
 * ```ts
 * import { createReadStream } from "fs";
 *
 * const file = await uploadFile({
 *   name: "report.pdf",
 *   mimeType: "application/pdf",
 *   content: createReadStream("/tmp/report.pdf"),
 *   parentId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
 * });
 * console.log(file.id);
 * ```
 */
export async function uploadFile(
  options: UploadFileOptions,
): Promise<DriveUploadedFile> {

  const drive = new DriveClient().create();

  const response = await drive.files.create({

    fields: "id,name,mimeType,webViewLink,createdTime,size",

    supportsAllDrives: true,

    requestBody: {

      name: options.name,

      mimeType: options.mimeType,

      parents: options.parentId ? [options.parentId] : undefined,

    },

    media: {

      mimeType: options.mimeType,

      body: options.content,

    },

  });

  const f = response.data;

  if (typeof f.id !== "string" || typeof f.name !== "string") {

    throw new Error(
      `Drive API returned incomplete metadata after uploading file "${options.name}".`,
    );

  }

  return {

    id: f.id,

    name: f.name,

    mimeType: f.mimeType ?? options.mimeType,

    webViewLink: f.webViewLink ?? undefined,

    createdTime: f.createdTime ?? undefined,

    size: f.size ?? undefined,

  };

}
