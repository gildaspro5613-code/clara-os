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
   * View URL.
   */
  url?: string;

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

    if (Buffer.isBuffer(content)) {

      return Readable.from(content);

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
