/**
 * ============================================
 * CLARA OS
 * Read Calendar Capability
 * --------------------------------------------
 * Workflow :
 * resolve workspace calendar
 * → read calendar events.
 * ============================================
 */

import {
  getWorkspaceCalendar,
} from "@/lib/core/workspace/workspace-resolver";

import {
  GoogleCalendarEngine,
} from "@/lib/connectors/internal/google/calendar/google-calendar-engine";

import type { ReadCalendarContext } from "./context";
import type { ReadCalendarResult } from "./result";

export class ReadCalendarWorkflow {

  private readonly calendar =
    new GoogleCalendarEngine();

  public async execute(
    context: ReadCalendarContext,
  ): Promise<ReadCalendarResult> {

    const workspaceCalendar =
      await getWorkspaceCalendar();

    if (!workspaceCalendar) {

      return {

        success: false,

        calendarId: "",

        events: [],

        affectedEvents: 0,

        message:
          "Workspace calendar not found.",

        completedAt:
          new Date(),

      };

    }

    try {

      const result =
        await this.calendar.read({

          calendarId:
            workspaceCalendar.calendarId,

          title:
            workspaceCalendar.name,

          start:
            context.timeMin
              ? new Date(context.timeMin)
              : new Date(),

          end:
            context.timeMax
              ? new Date(context.timeMax)
              : new Date(),

        });

      return {

        success:
          result.success,

        calendarId:
          workspaceCalendar.calendarId,

        events:
          result.events ?? [],

        affectedEvents:
          result.events?.length ?? 0,

        message:
          result.message ??
          "Calendar events loaded successfully.",

        completedAt:
          result.completedAt,

      };

    } catch (error) {

      return {

        success: false,

        calendarId:
          workspaceCalendar.calendarId,

        events: [],

        affectedEvents: 0,

        message:
          error instanceof Error
            ? error.message
            : "Unable to read workspace calendar.",

        completedAt:
          new Date(),

      };

    }

  }

}
