/**
 * ============================================
 * CLARA OS
 * Read Document Capability
 * --------------------------------------------
 * Workflow :
 * read Google Document
 * → return document content.
 * ============================================
 */

import { GoogleDocsEngine } from "@/lib/connectors/internal/google/docs/google-docs-engine";

import type { ReadDocumentContext } from "./context";
import type { ReadDocumentResult } from "./result";

export class ReadDocumentWorkflow {

  private readonly docs =
    new GoogleDocsEngine();

  public async execute(
    context: ReadDocumentContext,
  ): Promise<ReadDocumentResult> {

    if (!context.documentId.trim()) {

      return {

        success: false,

        documentId: "",

        title:
          context.title ?? "",

        content: "",

        message:
          "Google Document documentId is required.",

        completedAt:
          new Date(),

      };

    }

    try {

      const result =
        await this.docs.read({

          documentId:
            context.documentId,

          title:
            context.title ?? "",

        });

      return {

        success:
          result.success,

        documentId:
          result.documentId,

        title:
          result.title,

        content:
          result.content ?? "",

        message:
          result.message ??
          "Document read successfully.",

        completedAt:
          result.completedAt,

      };

    } catch (error) {

      return {

        success: false,

        documentId:
          context.documentId,

        title:
          context.title ?? "",

        content: "",

        message:
          error instanceof Error
            ? error.message
            : "Unable to read Google Document.",

        completedAt:
          new Date(),

      };

    }

  }

}
