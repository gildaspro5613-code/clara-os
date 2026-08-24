/**
 * ============================================
 * CLARA OS
 * Create Calendar Event Capability
 * --------------------------------------------
 * Workflow :
 * resolve workspace calendar
 * → create Google Calendar event.
 * ============================================
 */

import {
  getWorkspaceCalendar,
} from "@/lib/core/workspace/workspace-resolver";

import {
  GoogleCalendarEngine,
} from "@/lib/connectors/internal/google/calendar/google-calendar-engine";

import type { CreateCalendarEventContext } from "./context";
import type { CreateCalendarEventResult } from "./result";

export class CreateCalendarEventWorkflow {

  private readonly calendar =
    new GoogleCalendarEngine();

  public async execute(
    context: CreateCalendarEventContext,
  ): Promise<CreateCalendarEventResult> {

    if (!context.title.trim()) {

      return {

        success: false,

        eventId: "",

        calendarId: "",

        message:
          "Event title is required.",

        completedAt:
          new Date(),

      };

    }

    if (!context.start.trim()) {

      return {

        success: false,

        eventId: "",

        calendarId: "",

        message:
          "Event start is required.",

        completedAt:
          new Date(),

      };

    }

    if (!context.end.trim()) {

      return {

        success: false,

        eventId: "",

        calendarId: "",

        message:
          "Event end is required.",

        completedAt:
          new Date(),

      };

    }

    const start =
      new Date(context.start);

    const end =
      new Date(context.end);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {

      return {

        success: false,

        eventId: "",

        calendarId: "",

        message:
          "Event start and end must be valid dates.",

        completedAt:
          new Date(),

      };

    }

    if (end <= start) {

      return {

        success: false,

        eventId: "",

        calendarId: "",

        message:
          "Event end must be after event start.",

        completedAt:
          new Date(),

      };

    }

    const workspaceCalendar =
      await getWorkspaceCalendar();

    if (!workspaceCalendar) {

      return {

        success: false,

        eventId: "",

        calendarId: "",

        message:
          "Workspace calendar not found.",

        completedAt:
          new Date(),

      };

    }

    try {

      const result =
        await this.calendar.create({

          calendarId:
            workspaceCalendar.calendarId,

          title:
            context.title.trim(),

          description:
            context.description,

          location:
            context.location,

          start,

          end,

          attendees:
            context.attendees,

        });

      return {

        success:
          result.success,

        eventId:
          result.eventId,

        calendarId:
          workspaceCalendar.calendarId,

        eventUrl:
          result.url,

        message:
          result.message ??
          "Calendar event created successfully.",

        completedAt:
          result.completedAt,

      };

    } catch (error) {

      return {

        success: false,

        eventId: "",

        calendarId:
          workspaceCalendar.calendarId,

        message:
          error instanceof Error
            ? error.message
            : "Unable to create calendar event.",

        completedAt:
          new Date(),

      };

    }

  }

}
