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

        prompt: context.objective,

        model: "gpt-5.5",

      });

    return {

      success: response.success,

      title: context.title,

      message: response.message,

      completedAt: new Date(),

    };

  }

}