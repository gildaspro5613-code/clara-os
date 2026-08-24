/**
 * ============================================
 * CLARA OS
 * Find Document Capability
 * --------------------------------------------
 * Workflow :
 * search Google Drive
 * → return matching Google Document.
 * ============================================
 */

import { GoogleDriveEngine } from "@/lib/connectors/internal/google/drive/google-drive-engine";

import type { FindDocumentContext } from "./context";
import type { FindDocumentResult } from "./result";

export class FindDocumentWorkflow {

  private readonly drive =
    new GoogleDriveEngine();

  public async execute(
    context: FindDocumentContext,
  ): Promise<FindDocumentResult> {

    if (!context.name.trim()) {

      return {

        success: false,

        message:
          "Document name is required.",

        completedAt:
          new Date(),

      };

    }

    try {

      const escapedName =
        context.name
          .trim()
          .replace(/'/g, "\\'");

      const result =
        await this.drive.list({

          pageSize: 10,

          query:
            `name='${escapedName}' and ` +
            `mimeType='application/vnd.google-apps.document' and ` +
            `trashed=false`,

        });

      const document =
        result.files[0];

      if (!document) {

        return {

          success: false,

          message:
            `Google Document "${context.name.trim()}" not found.`,

          completedAt:
            new Date(),

        };

      }

      return {

        success: true,

        documentId:
          document.fileId,

        documentName:
          document.fileName,

        documentUrl:
          document.url,

        message:
          `Google Document "${document.fileName}" found successfully.`,

        completedAt:
          new Date(),

      };

    } catch (error) {

      return {

        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to search Google Drive.",

        completedAt:
          new Date(),

      };

    }

  }

}
