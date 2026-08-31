/**
 * ============================================
 * CLARA OS
 * Google Drive – List Files
 * --------------------------------------------
 * File : list-files.ts
 * Responsibility :
 * Lists files stored in Google Drive
 * using DriveClient.
 * ============================================
 */

import type { drive_v3 } from "googleapis";

import { DriveClient } from "./drive-client";

/**
 * Options for listing Google Drive files.
 */
export interface ListFilesOptions {

  /**
   * Maximum number of files to return (1–1000).
   * Defaults to the API default when omitted.
   */
  pageSize?: number;

  /**
   * Pagination token returned by a previous call.
   * Omit to start from the first page.
   */
  pageToken?: string;

  /**
   * Google Drive search query string.
   * @see https://developers.google.com/drive/api/guides/search-files
   */
  query?: string;

}

/**
 * A single Google Drive file entry.
 */
export interface DriveFile {

  /**
   * Unique file identifier.
   */
  id: string;

  /**
   * Display name of the file.
   */
  name: string;

  /**
   * MIME type of the file.
   */
  mimeType?: string;

  /**
   * URL to open the file in a browser.
   */
  webViewLink?: string;

}

/**
 * Result returned by {@link listFiles}.
 */
export interface ListFilesResult {

  /**
   * Files matching the request.
   */
  files: DriveFile[];

  /**
   * Token to retrieve the next page of results.
   * `undefined` when there are no more pages.
   */
  nextPageToken?: string;

}

/**
 * Lists files in Google Drive.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates the listing to the Drive API v3 `files.list` endpoint.
 * Errors thrown by the API are propagated to the caller unchanged.
 *
 * @param options - Optional filters and pagination parameters.
 * @returns A page of Drive files and an optional continuation token.
 *
 * @example
 * ```ts
 * const { files, nextPageToken } = await listFiles({ pageSize: 10 });
 * ```
 */
export async function listFiles(
  options?: ListFilesOptions,
): Promise<ListFilesResult> {

  const drive = await new DriveClient().create();

  const params: drive_v3.Params$Resource$Files$List = {

    fields:
      "nextPageToken,files(id,name,mimeType,webViewLink)",

    includeItemsFromAllDrives: true,

    supportsAllDrives: true,

  };

  if (options?.pageSize !== undefined) {

    params.pageSize = options.pageSize;

  }

  if (options?.pageToken !== undefined) {

    params.pageToken = options.pageToken;

  }

  if (options?.query !== undefined) {

    params.q = options.query;

  }

  const response = await drive.files.list(params);

  const rawFiles: drive_v3.Schema$File[] =
    response.data.files ?? [];

  const files: DriveFile[] = rawFiles
    .filter(
      (f): f is drive_v3.Schema$File & { id: string; name: string } =>
        typeof f.id === "string" && typeof f.name === "string",
    )
    .map((f) => ({

      id: f.id,

      name: f.name,

      mimeType: f.mimeType ?? undefined,

      webViewLink: f.webViewLink ?? undefined,

    }));

  return {

    files,

    nextPageToken:
      response.data.nextPageToken ?? undefined,

  };

}
