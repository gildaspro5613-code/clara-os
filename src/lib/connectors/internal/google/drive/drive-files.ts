/**
 * ============================================
 * CLARA OS
 * Google Drive Files
 * --------------------------------------------
 * File : drive-files.ts
 * Responsibility :
 * Uploads, downloads and
 * deletes Google Drive files.
 * ============================================
 */

import type { drive_v3 } from "googleapis";
import { Readable } from "node:stream";

import type { GoogleDriveContext } from "./google-drive-context";

/**
 * Downloaded Google Drive file.
 */
export interface DriveFileDownload {

  /**
   * File content.
   */
  content: Buffer;

  /**
   * File identifier.
   */
  fileId: string;

  /**
   * File name.
   */
  fileName: string;

  /**
   * MIME type.
   */
  mimeType?: string;

  /**
   * Parent folder identifiers.
   */
  parents?: string[];

  /**
   * View URL.
   */
  url?: string;

}

/**
 * Stored Google Drive file.
 */
export interface DriveFileRecord {

  /**
   * File identifier.
   */
  fileId: string;

  /**
   * File name.
   */
  fileName: string;

  /**
   * MIME type.
   */
  mimeType?: string;

  /**
   * Parent folder identifiers.
   */
  parents?: string[];

  /**
   * View URL.
   */
  url?: string;

}

/**
 * Options for listing Google Drive files.
 */
export interface DriveFileListOptions {
  pageSize?: number;
  pageToken?: string;
  query?: string;
  fileName?: string;
  folderId?: string;
}

/**
 * Result of a Google Drive file listing.
 */
export interface DriveFileListResult {
  files: DriveFileRecord[];
  entries?: import("./google-drive-result").DriveResourceEntry[];
  nextPageToken?: string;
}

/**
 * Google Drive files service.
 */
export class DriveFiles {

  /**
   * Creates a file service.
   */
  constructor(
    private readonly drive: drive_v3.Drive,
  ) {}

  /**
   * Lists files stored in Google Drive.
   */
  public async list(
    options: DriveFileListOptions = {},
  ): Promise<DriveFileListResult> {

    const response = await this.drive.files.list({
      fields:
        "nextPageToken,files(id,name,mimeType,webViewLink)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: options.pageSize,
      pageToken: options.pageToken,
      q: options.query,
    });

    const rawFiles =
      response.data.files ?? [];

    const files: DriveFileRecord[] =
      rawFiles
        .filter(
          (file) =>
            typeof file.id === "string" &&
            typeof file.name === "string",
        )
        .map((file) => ({
          fileId: file.id as string,
          fileName: file.name as string,
          mimeType:
            file.mimeType ?? undefined,
          url:
            file.webViewLink ?? undefined,
          parents:
            file.parents ?? undefined,
        }));

    return {
      files,
      nextPageToken:
        response.data.nextPageToken ?? undefined,
    };
  }

  /**
   * Reads a Google Workspace document as plain text.
   */
  public async readContent(
    fileId: string,
    mimeType?: string,
  ): Promise<{
    textContent: string;
    mimeType?: string;
  }> {

    const metadata = await this.drive.files.get({
      fileId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });

    const actualMimeType =
      metadata.data.mimeType ?? mimeType;

    if (!actualMimeType) {
      return { textContent: "" };
    }

    const exportable =
      actualMimeType === "application/vnd.google-apps.document" ||
      actualMimeType === "application/vnd.google-apps.spreadsheet" ||
      actualMimeType === "application/vnd.google-apps.presentation";

    if (exportable) {

      const response = await this.drive.files.export({
        fileId,
        mimeType: "text/plain",
      });

      return {
        textContent:
          typeof response.data === "string"
            ? response.data
            : String(response.data ?? ""),
        mimeType: actualMimeType,
      };

    }

    return {
      textContent: "",
      mimeType: actualMimeType,
    };
  }

  /**
   * Uploads a file.
   */
  public async upload(
    context: GoogleDriveContext,
  ): Promise<DriveFileRecord> {

    const response =
      await this.drive.files.create({

        requestBody: {

          name: context.fileName,

          parents: context.folderId
            ? [context.folderId]
            : undefined,

        },

        media: {

          mimeType:
            context.mimeType ??
            "application/octet-stream",

          body: this.toReadable(
            context.content,
          ),

        },

        fields:
          "id,name,mimeType,webViewLink",

        supportsAllDrives: true,

      });

    const file = response.data;

    if (!file.id || !file.name) {

      throw new Error(
        "Google Drive did not return the uploaded file.",
      );

    }

    return {

      fileId: file.id,

      fileName: file.name,

      mimeType: file.mimeType ?? undefined,

      url: file.webViewLink ?? undefined,

    };

  }

  /**
   * Downloads a file.
   */
  public async download(
    fileId: string,
  ): Promise<DriveFileDownload> {

    const metadata =
      await this.drive.files.get({

        fileId,

        fields:
          "id,name,mimeType,webViewLink",

        supportsAllDrives: true,

      });

    const contentResponse =
      await this.drive.files.get(
        {

          fileId,

          alt: "media",

          supportsAllDrives: true,

        },
        {

          responseType: "arraybuffer",

        },
      );

    const file = metadata.data;

    if (!file.id || !file.name) {

      throw new Error(
        "Google Drive did not return the requested file.",
      );

    }

    return {

      content: Buffer.from(
        contentResponse.data as ArrayBuffer,
      ),

      fileId: file.id,

      fileName: file.name,

      mimeType: file.mimeType ?? undefined,

      url: file.webViewLink ?? undefined,

    };

  }

  /**
   * Deletes a file.
   */
  public async delete(
    fileId: string,
  ): Promise<void> {

    await this.drive.files.delete({

      fileId,

      supportsAllDrives: true,

    });

  }

  /**
   * Converts content to a readable stream.
   */
  private toReadable(
    content: unknown,
  ): Readable {


    if (content instanceof Uint8Array) {

      return Readable.from(content);

    }

    if (typeof content === "string") {

      return Readable.from(
        Buffer.from(content),
      );

    }


    if (content === undefined) {

      return Readable.from([]);

    }

    return Readable.from(
      Buffer.from(
        JSON.stringify(content),
      ),
    );

  }

}
