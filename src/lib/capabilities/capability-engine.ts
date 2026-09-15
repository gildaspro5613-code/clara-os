/**
 * ============================================
 * CLARA OS
 * Capability Engine
 * --------------------------------------------
 * File : capability-engine.ts
 * Responsibility :
 * Executes Clara capabilities.
 * ============================================
 */

import { CapabilityRegistry } from "./capability-registry";

import { GenerateDocumentContext } from "./generate-document/context";
import { GenerateDocumentWorkflow } from "./generate-document/workflow";

import { WorkspaceInstallContext } from "./workspace-install/context";
import { WorkspaceInstallWorkflow } from "./workspace-install/workflow";

import { DriveSearchContext } from "./drive-search/context";
import { DriveSearchWorkflow } from "./drive-search/workflow";
import type { DriveResourceEntry } from "@/lib/connectors/internal/google/drive/google-drive-result";
import type { DriveContext } from "./drive-search/result";

/**
 * Capability execution request.
 */
export interface CapabilityExecutionRequest {

  /**
   * Capability identifier.
   */
  readonly capabilityId: string;

  /**
   * Capability execution context.
   */
  readonly context: unknown;

}

/**
 * Capability execution result.
 */
export interface CapabilityExecutionResult {

  /**
   * Execution status.
   */
  readonly success: boolean;

  /**
   * Execution message.
   */
  readonly message: string;

  /**
   * Optional generated content (text).
   */
  readonly content?: string;

  /**
   * Drive resources returned by search/list operations.
   */
  readonly driveEntries?: DriveResourceEntry[];

  /**
   * Structured Drive context for LLM injection.
   */
  readonly driveContext?: DriveContext;

  /**
   * Completion timestamp.
   */
  readonly completedAt: Date;

}

/**
 * Capability Engine.
 */
export class CapabilityEngine {

  /**
   * Registry.
   */
  private readonly registry =
    new CapabilityRegistry();

  /**
   * Workflows.
   */
  private readonly generateDocument =
    new GenerateDocumentWorkflow();

  private readonly workspaceInstall =
    new WorkspaceInstallWorkflow();

  private readonly driveSearch =
    new DriveSearchWorkflow();

  /**
   * Executes one capability.
   */
  public async execute(
    request: CapabilityExecutionRequest,
  ): Promise<CapabilityExecutionResult> {

    const capability =
      this.registry.findById(
        request.capabilityId,
      );

    if (!capability) {

      return {

        success: false,

        message: `Unknown capability: ${request.capabilityId}`,

        completedAt: new Date(),

      };

    }

    switch (request.capabilityId) {

      case "generate-document": {

        const result =
          await this.generateDocument.execute(

            request.context as GenerateDocumentContext,

          );

        return {

          success: result.success,

          message: result.message,

          content: result.content,

          completedAt: result.completedAt,

        };

      }

      case "workspace-install": {

        const result =
          await this.workspaceInstall.execute(

            request.context as WorkspaceInstallContext,

          );

        return {

          success: result.success,

          message: result.message,

          completedAt: result.completedAt,

        };

      }

      case "search-drive": {

        const result =
          await this.driveSearch.execute(

            request.context as DriveSearchContext,

          );

        return {

          success: result.success,

          message: result.message,

          driveEntries: result.entries,

          driveContext: result.driveContext,

          content: result.textContent,

          completedAt: result.completedAt,

        };

      }

      default:

        return {

          success: false,

          message: "Capability not implemented.",

          completedAt: new Date(),

        };

    }

  }

}