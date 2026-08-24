/**
 * ============================================
 * CLARA OS
 * Update Calendar Event Capability
 * --------------------------------------------
 * Workflow :
 * resolve workspace calendar
 * → update Google Calendar event.
 * ============================================
 */

import {
  getWorkspaceCalendar,
} from "@/lib/core/workspace/workspace-resolver";

import {
  GoogleCalendarEngine,
} from "@/lib/connectors/internal/google/calendar/google-calendar-engine";

import type { UpdateCalendarEventContext } from "./context";
import type { UpdateCalendarEventResult } from "./result";

export class UpdateCalendarEventWorkflow {

  private readonly calendar =
    new GoogleCalendarEngine();

  public async execute(
    context: UpdateCalendarEventContext,
  ): Promise<UpdateCalendarEventResult> {

    if (!context.eventId.trim()) {

      return {

        success: false,

        eventId: "",

        calendarId: "",

        message:
          "Event ID is required.",

        completedAt:
          new Date(),

      };

    }

    const workspaceCalendar =
      await getWorkspaceCalendar();

    if (!workspaceCalendar) {

      return {

        success: false,

        eventId:
          context.eventId,

        calendarId: "",

        message:
          "Workspace calendar not found.",

        completedAt:
          new Date(),

      };

    }

    const event: Record<string, unknown> = {};

    if (context.title !== undefined) {

      event.summary =
        context.title.trim();

    }

    if (context.description !== undefined) {

      event.description =
        context.description;

    }

    if (context.location !== undefined) {

      event.location =
        context.location;

    }

    if (context.start !== undefined) {

      const start =
        new Date(context.start);

      if (Number.isNaN(start.getTime())) {

        return {

          success: false,

          eventId:
            context.eventId,

          calendarId:
            workspaceCalendar.calendarId,

          message:
            "Event start must be a valid date.",

          completedAt:
            new Date(),

        };

      }

      event.start = {

        dateTime:
          start.toISOString(),

      };

    }

    if (context.end !== undefined) {

      const end =
        new Date(context.end);

      if (Number.isNaN(end.getTime())) {

        return {

          success: false,

          eventId:
            context.eventId,

          calendarId:
            workspaceCalendar.calendarId,

          message:
            "Event end must be a valid date.",

          completedAt:
            new Date(),

        };

      }

      event.end = {

        dateTime:
          end.toISOString(),

      };

    }

    if (context.attendees !== undefined) {

      event.attendees =
        context.attendees.map(
          email => ({
            email,
          }),
        );

    }

    if (
      Object.keys(event).length === 0
    ) {

      return {

        success: false,

        eventId:
          context.eventId,

        calendarId:
          workspaceCalendar.calendarId,

        message:
          "At least one event field must be provided for update.",

        completedAt:
          new Date(),

      };

    }

    try {

      const result =
        await this.calendar.update({

          calendarId:
            workspaceCalendar.calendarId,

          eventId:
            context.eventId,

          title:
            typeof event.summary === "string"
              ? event.summary
              : "",

          description:
            typeof event.description === "string"
              ? event.description
              : undefined,

          location:
            typeof event.location === "string"
              ? event.location
              : undefined,

          start:
            context.start
              ? new Date(context.start)
              : new Date(),

          end:
            context.end
              ? new Date(context.end)
              : new Date(),

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
          "Calendar event updated successfully.",

        completedAt:
          result.completedAt,

      };

    } catch (error) {

      return {

        success: false,

        eventId:
          context.eventId,

        calendarId:
          workspaceCalendar.calendarId,

        message:
          error instanceof Error
            ? error.message
            : "Unable to update calendar event.",

        completedAt:
          new Date(),

      };

    }

  }

}
