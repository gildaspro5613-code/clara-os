/**
 * ============================================
 * CLARA OS
 * Delete Calendar Event Capability
 * --------------------------------------------
 * Workflow :
 * resolve workspace calendar
 * → delete calendar event.
 * ============================================
 */

import {
  getWorkspaceCalendar,
} from "@/lib/core/workspace/workspace-resolver";

import {
  GoogleCalendarEngine,
} from "@/lib/connectors/internal/google/calendar/google-calendar-engine";

import type { DeleteCalendarEventContext } from "./context";
import type { DeleteCalendarEventResult } from "./result";

export class DeleteCalendarEventWorkflow {

  private readonly calendar =
    new GoogleCalendarEngine();

  public async execute(
    context: DeleteCalendarEventContext,
  ): Promise<DeleteCalendarEventResult> {

    const workspaceCalendar =
      await getWorkspaceCalendar();

    if (!workspaceCalendar) {

      return {

        success: false,

        eventId:
          context.eventId,

        message:
          "Workspace calendar not found.",

        completedAt:
          new Date(),

      };

    }

    try {

      const result =
        await this.calendar.delete({

          calendarId:
            workspaceCalendar.calendarId,

          eventId:
            context.eventId,

          title:
            "Delete Calendar Event",

          start:
            new Date(),

          end:
            new Date(),

        });

      return {

        success:
          result.success,

        eventId:
          context.eventId,

        message:
          result.message ??
          "Calendar event deleted successfully.",

        completedAt:
          result.completedAt,

      };

    } catch (error) {

      return {

        success: false,

        eventId:
          context.eventId,

        message:
          error instanceof Error
            ? error.message
            : "Unable to delete calendar event.",

        completedAt:
          new Date(),

      };

    }

  }

}
