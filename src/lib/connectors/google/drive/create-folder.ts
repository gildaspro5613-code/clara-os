/**
 * ============================================
 * CLARA OS
 * Google Drive – Create Folder
 * --------------------------------------------
 * File : create-folder.ts
 * Responsibility :
 * Creates a folder in Google Drive and
 * returns its metadata.
 * ============================================
 */

import { DriveClient } from "./drive-client";

/**
 * Options for creating a Google Drive folder.
 */
export interface CreateFolderOptions {

  /**
   * Display name of the folder to create.
   */
  name: string;

  /**
   * Identifier of the parent folder.
   * When omitted the folder is created in My Drive root.
   */
  parentId?: string;

}

/**
 * Metadata returned after a folder has been created.
 */
export interface DriveFolder {

  /**
   * Unique folder identifier.
   */
  id: string;

  /**
   * Display name of the folder.
   */
  name: string;

  /**
   * MIME type – always `application/vnd.google-apps.folder`.
   */
  mimeType: string;

  /**
   * URL to open the folder in a browser.
   */
  webViewLink?: string;

  /**
   * RFC 3339 timestamp of creation.
   */
  createdTime?: string;

}

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/**
 * Creates a folder in Google Drive.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates creation to the Drive API v3 `files.create` endpoint.
 * Errors thrown by the API are propagated to the caller unchanged.
 *
 * @param options - Folder name and optional parent identifier.
 * @returns Metadata of the newly created folder.
 *
 * @example
 * ```ts
 * const folder = await createFolder({ name: "Reports", parentId: "root" });
 * console.log(folder.id);
 * ```
 */
export async function createFolder(
  options: CreateFolderOptions,
): Promise<DriveFolder> {

  const drive = new DriveClient().create();

  const response = await drive.files.create({

    fields: "id,name,mimeType,webViewLink,createdTime",

    supportsAllDrives: true,

    requestBody: {

      name: options.name,

      mimeType: FOLDER_MIME_TYPE,

      parents: options.parentId ? [options.parentId] : undefined,

    },

  });

  const f = response.data;

  if (typeof f.id !== "string" || typeof f.name !== "string") {

    throw new Error(
      `Drive API returned incomplete metadata after creating folder "${options.name}".`,
    );

  }

  return {

    id: f.id,

    name: f.name,

    mimeType: f.mimeType ?? FOLDER_MIME_TYPE,

    webViewLink: f.webViewLink ?? undefined,

    createdTime: f.createdTime ?? undefined,

  };

}
