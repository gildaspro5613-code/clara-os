/**
 * ============================================
 * CLARA OS
 * Generate Document Capability
 * --------------------------------------------
 * File : workflow.ts
 * Responsibility :
 * Describes and executes the
 * Generate Document capability workflow.
 * ============================================
 */

import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import { GoogleDocsEngine } from "@/lib/connectors/internal/google/docs/google-docs-engine";

import { GenerateDocumentContext } from "./context";
import { GenerateDocumentResult } from "./result";

/**
 * Workflow step.
 */
export interface WorkflowStep {

  /**
   * Step identifier.
   */
  readonly id: string;

  /**
   * Human readable name.
   */
  readonly name: string;

  /**
   * Capability executed.
   */
  readonly capability: string;

}

/**
 * Generate Document workflow definition.
 */
export const GENERATE_DOCUMENT_WORKFLOW: WorkflowStep[] = [

  {

    id: "draft",

    name: "Generate draft",

    capability: "generate-text",

  },

  {

    id: "publish",

    name: "Create business document",

    capability: "publish-document",

  },

  {

    id: "archive",

    name: "Store document",

    capability: "store-file",

  },

];

/**
 * Generate Document workflow.
 */
export class GenerateDocumentWorkflow {

  /**
   * OpenAI Responses engine.
   */
  private readonly openAI =
    new OpenAIResponsesEngine();

  /**
   * Executes the workflow.
   */
  public async execute(
    context: GenerateDocumentContext,
  ): Promise<GenerateDocumentResult> {

    const response =
      await this.openAI.generate({

        prompt: [
          `Titre : ${context.title}`,
          `Objectif : ${context.objective}`,
          `Public cible : ${context.audience}`,
          `Langue : ${context.language}`,
          `Ton : ${context.tone}`,
          context.template
            ? `Modèle : ${context.template}`
            : "",
          context.data
            ? `Données métier : ${JSON.stringify(context.data)}`
            : "",
          "",
          "Rédige le contenu complet du document.",
        ]
          .filter(Boolean)
          .join("\n"),

        model: "gpt-5.5",

      });

    if (!response.success || !response.content) {

      return {

        success: false,

        title: context.title,

        content: response.content,

        message: response.message,

        completedAt: new Date(),

      };

    }

    const docs =
      new GoogleDocsEngine();

    const created =
      await docs.create({

        title: context.title,

        content: "",

      });

    if (!created.success) {

      return {

        success: false,

        title: context.title,

        content: response.content,

        message: created.message ?? "Impossible de créer le document Google Docs.",

        completedAt: new Date(),

      };

    }

    const updated =
      await docs.update({

        documentId: created.documentId,

        title: context.title,

        content: response.content,

      });

    if (!updated.success) {

      return {

        success: false,

        title: context.title,

        content: response.content,

        documentId: created.documentId,

        documentUrl: created.url,

        message: updated.message ?? "Impossible d'insérer le contenu dans le document Google Docs.",

        completedAt: new Date(),

      };

    }

    if (context.table) {

      const table =
        await docs.insertTable(

          {

            documentId:
              created.documentId,

            title:
              context.title,

          },

          context.table.rows,

          context.table.columns,

        );

      if (!table.success) {

        return {

          success: false,

          title: context.title,

          content: response.content,

          documentId: created.documentId,

          documentUrl: created.url,

          message:
            table.message ??
            "Impossible d'insérer le tableau dans le document Google Docs.",

          completedAt:
            new Date(),

        };

      }

    }

    return {

      success: true,

      title: context.title,

      content: response.content,

      documentId: created.documentId,

      documentUrl: created.url,

      message: "Document generated and created successfully.",

      completedAt: new Date(),

    };

  }

}