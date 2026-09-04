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

import { ReadCalendarContext } from "./read-calendar/context";
import { ReadCalendarWorkflow } from "./read-calendar/workflow";

import { ReadGmailContext } from "./read-gmail/context";
import { ReadGmailWorkflow } from "./read-gmail/workflow";

import {
  CreateCalendarEventContext,
} from "./create-calendar-event/context";

import {
  CreateCalendarEventWorkflow,
} from "./create-calendar-event/workflow";

import {
  UpdateCalendarEventContext,
} from "./update-calendar-event/context";

import {
  UpdateCalendarEventWorkflow,
} from "./update-calendar-event/workflow";

import {
  DeleteCalendarEventContext,
} from "./delete-calendar-event/context";

import {
  DeleteCalendarEventWorkflow,
} from "./delete-calendar-event/workflow";

import { FindDocumentContext } from "./find-document/context";
import { FindDocumentWorkflow } from "./find-document/workflow";



import { ReadDocumentContext } from "./read-document/context";
import { ReadDocumentWorkflow } from "./read-document/workflow";

import { DriveSearchContext } from "./drive-search/context";
import { DriveSearchWorkflow } from "./drive-search/workflow";

import { SendGmailContext } from "./send-gmail/context";
import { SendGmailWorkflow } from "./send-gmail/workflow";
import { GitHubReadExecutor, type OperationalCapabilityResult } from "./github-read/executor";

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

  /** Provider-neutral operational result for connector-backed capabilities. */
  readonly operationalResult?: OperationalCapabilityResult;

  /**
   * Completion timestamp.
   */
  readonly completedAt: Date;

}

/**
 * Capability Engine.
 */
export class CapabilityEngine {

  public constructor(private readonly githubRead = new GitHubReadExecutor()) {}

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

  private readonly readCalendar =
    new ReadCalendarWorkflow();

  private readonly readGmail =
    new ReadGmailWorkflow();

  private readonly createCalendarEvent =
    new CreateCalendarEventWorkflow();

  private readonly updateCalendarEvent =
    new UpdateCalendarEventWorkflow();

  private readonly deleteCalendarEvent =
    new DeleteCalendarEventWorkflow();

  private readonly findDocument =
    new FindDocumentWorkflow();



  private readonly readDocument =
    new ReadDocumentWorkflow();

  private readonly sendGmail =
    new SendGmailWorkflow();

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

      case "github.repository.list":
      case "github.repository.read":
      case "github.branch.list":
      case "github.file.read":
      case "github.commit.list":
      case "github.issue.list":
      case "github.issue.read":
      case "github.pull_request.list":
      case "github.pull_request.read":
      case "github.checks.read": {
        const result = await this.githubRead.execute(request.capabilityId, request.context);
        return {
          success: result.success,
          message: result.success
            ? `GitHub READ capability completed: ${request.capabilityId}`
            : result.error?.message ?? "GitHub READ capability failed.",
          content: result.success ? JSON.stringify(result.data) : undefined,
          operationalResult: result,
          completedAt: new Date(),
        };
      }

      case "search-drive": {

        const result =
          await this.driveSearch.execute(
            request.context as DriveSearchContext,
          );

        return {

          success:
            result.success,

          message:
            result.message,

          content:
            result.driveContext
              ? JSON.stringify(
                  result.driveContext,
                )
              : result.entries
                ? JSON.stringify(
                    result.entries,
                  )
                : undefined,

          completedAt:
            result.completedAt,

        };

      }

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

      case "find-document": {

        const result =
          await this.findDocument.execute(

            request.context as FindDocumentContext,

          );

        return {

          success:
            result.success,

          message:
            result.message,

          content:
            result.documentId
              ? JSON.stringify({
                  documentId:
                    result.documentId,
                  documentName:
                    result.documentName,
                  documentUrl:
                    result.documentUrl,
                })
              : undefined,

          documentId:
            result.documentId,

          documentUrl:
            result.documentUrl,

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

      case "send-gmail": {

        const result =
          await this.sendGmail.execute(

            request.context as SendGmailContext,

          );

        return {

          success:
            result.success,

          message:
            result.message,

          content:
            JSON.stringify({

              messageId:
                result.messageId,

              threadId:
                result.threadId,

            }),

          completedAt:
            result.completedAt,

        };

      }

      case "read-document": {

        const result =
          await this.readDocument.execute(

            request.context as ReadDocumentContext,

          );

        return {

          success:
            result.success,

          message:
            result.message,

          content:
            result.content,

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

      case "delete-calendar-event": {

        const result =
          await this.deleteCalendarEvent.execute(

            request.context as DeleteCalendarEventContext,

          );

        return {

          success: result.success,

          message: result.message,

          completedAt: result.completedAt,

        };

      }

      case "update-calendar-event": {

        const result =
          await this.updateCalendarEvent.execute(

            request.context as UpdateCalendarEventContext,

          );

        return {

          success:
            result.success,

          message:
            result.message,

          documentUrl:
            result.eventUrl,

          content:
            JSON.stringify({

              eventId:
                result.eventId,

              calendarId:
                result.calendarId,

              eventUrl:
                result.eventUrl,

            }),

          completedAt:
            result.completedAt,

        };

      }

      case "create-calendar-event": {

        const result =
          await this.createCalendarEvent.execute(

            request.context as CreateCalendarEventContext,

          );

        return {

          success:
            result.success,

          message:
            result.message,

          documentId:
            undefined,

          documentUrl:
            result.eventUrl,

          content:
            JSON.stringify({

              eventId:
                result.eventId,

              calendarId:
                result.calendarId,

              eventUrl:
                result.eventUrl,

            }),

          completedAt:
            result.completedAt,

        };

      }

      case "read-gmail": {

        const result =
          await this.readGmail.execute(

            request.context as ReadGmailContext,

          );

        return {

          success:
            result.success,

          message:
            result.message,

          content:
            JSON.stringify(
              result.emails,
            ),

          completedAt:
            result.completedAt,

        };

      }

      case "read-calendar": {

        const result =
          await this.readCalendar.execute(

            request.context as ReadCalendarContext,

          );

        return {

          success:
            result.success,

          message:
            result.message,

          content:
            JSON.stringify(
              result.events,
            ),

          completedAt:
            result.completedAt,

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