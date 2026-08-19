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

import { OrganizeDriveContext } from "./organize-drive/context";
import { OrganizeDriveWorkflow } from "./organize-drive/workflow";

import { UpdateSheetRowContext } from "./update-sheet-row/context";
import { UpdateSheetRowWorkflow } from "./update-sheet-row/workflow";

import { AppendSheetRowContext } from "./append-sheet-row/context";
import { AppendSheetRowWorkflow } from "./append-sheet-row/workflow";

import { ReadSheetContext } from "./read-sheet/context";
import { ReadSheetWorkflow } from "./read-sheet/workflow";

import { FindSheetRowContext } from "./find-sheet-row/context";
import { FindSheetRowWorkflow } from "./find-sheet-row/workflow";

import { DeleteSheetRowContext } from "./delete-sheet-row/context";
import { DeleteSheetRowWorkflow } from "./delete-sheet-row/workflow";

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
   * Optional generated content.
   */
  readonly content?: string;

  /**
   * Generated document identifier.
   */
  readonly documentId?: string;

  /**
   * Generated document URL.
   */
  readonly documentUrl?: string;

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

  private readonly organizeDrive =
    new OrganizeDriveWorkflow();

  private readonly updateSheetRow =
    new UpdateSheetRowWorkflow();

  private readonly appendSheetRow =
    new AppendSheetRowWorkflow();

  private readonly readSheet =
    new ReadSheetWorkflow();

  private readonly findSheetRow =
    new FindSheetRowWorkflow();

  private readonly deleteSheetRow =
    new DeleteSheetRowWorkflow();

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

          documentId: result.documentId,

          documentUrl: result.documentUrl,

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

      case "update-sheet-row": {

        const result =
          await this.updateSheetRow.execute(

            request.context as UpdateSheetRowContext,

          );

        return {

          success: result.success,

          message: result.message,

          completedAt: result.completedAt,

        };

      }

      case "organize-drive": {

        const result =
          await this.organizeDrive.execute(

            request.context as OrganizeDriveContext,

          );

        return {

          success: result.success,

          message: result.message,

          completedAt: result.completedAt,

        };

      }

      case "read-sheet": {

        const result =
          await this.readSheet.execute(

            request.context as ReadSheetContext,

          );

        return {

          success: result.success,

          message: result.message,

          content:
            JSON.stringify(
              result.values,
            ),

          completedAt:
            result.completedAt,

        };

      }

      case "find-sheet-row": {

        const result =
          await this.findSheetRow.execute(

            request.context as FindSheetRowContext,

          );

        return {

          success:
            result.success,

          message:
            result.message,

          content:
            JSON.stringify(
              result.rows,
            ),

          completedAt:
            result.completedAt,

        };

      }

      case "append-sheet-row": {

        const result =
          await this.appendSheetRow.execute(

            request.context as AppendSheetRowContext,

          );

        return {

          success: result.success,

          message: result.message,

          completedAt: result.completedAt,

        };

      }

      case "delete-sheet-row": {

        const result =
          await this.deleteSheetRow.execute(

            request.context as DeleteSheetRowContext,

          );

        return {

          success:
            result.success,

          message:
            result.message,

          completedAt:
            result.completedAt,

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