/**
 * ============================================
 * CLARA OS
 * Google Docs Connector
 * --------------------------------------------
 * File : google-docs-engine.ts
 * Responsibility :
 * Coordinates Google Docs
 * operations.
 * ============================================
 */

import { GoogleDocsContext } from "./google-docs-context";
import { GoogleDocsResult } from "./google-docs-result";

import { GoogleDocsIntegration } from "@/lib/integrations/google/docs";

/**
 * Google Docs engine.
 */
export class GoogleDocsEngine {

  /**
   * Google integration.
   */
  private readonly docs =
    new GoogleDocsIntegration();

  /**
   * Creates a document.
   */
  public async create(
    context: GoogleDocsContext,
  ): Promise<GoogleDocsResult> {

    const document =
      await this.docs.createDocument(
        context.title,
      );

    return {

      success: true,

      documentId: document.documentId,

      title: context.title,

      url: document.documentUrl,

      message: "Document created successfully.",

      completedAt: new Date(),

    };

  }

  /**
   * Reads a document.
   */
  public async read(
    context: GoogleDocsContext,
  ): Promise<GoogleDocsResult> {

    await this.docs.getDocument(
      context.documentId ?? "",
    );

    return {

      success: true,

      documentId: context.documentId ?? "",

      title: context.title,

      message: "Document loaded successfully.",

      completedAt: new Date(),

    };

  }

  /**
   * Updates a document.
   */
  public async update(
    context: GoogleDocsContext,
  ): Promise<GoogleDocsResult> {

    await this.docs.insertText(

      context.documentId ?? "",

      context.content ?? "",

    );

    return {

      success: true,

      documentId: context.documentId ?? "",

      title: context.title,

      message: "Document updated successfully.",

      completedAt: new Date(),

    };

  }

  /**
   * Inserts a table into a document.
   */
  public async insertTable(
    context: GoogleDocsContext,
    rows: number,
    columns: number,
  ): Promise<GoogleDocsResult> {

    await this.docs.insertTable(

      context.documentId ?? "",

      rows,

      columns,

    );

    return {

      success: true,

      documentId:
        context.documentId ?? "",

      title:
        context.title,

      message:
        "Table inserted successfully.",

      completedAt:
        new Date(),

    };

  }

  /**
   * Deletes a document.
   */
  public async delete(
    context: GoogleDocsContext,
  ): Promise<GoogleDocsResult> {

    await this.docs.deleteDocument();

    return {

      success: true,

      documentId: context.documentId ?? "",

      title: context.title,

      message: "Document deleted successfully.",

      completedAt: new Date(),

    };

  }

}