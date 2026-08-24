/**
 * ============================================
 * CLARA OS
 * Google Calendar Connector
 * --------------------------------------------
 * File : google-calendar-engine.ts
 * Responsibility :
 * Coordinates Google Calendar
 * operations.
 * ============================================
 */

import { GoogleCalendarContext } from "./google-calendar-context";
import { GoogleCalendarResult } from "./google-calendar-result";

/**
 * Google Calendar engine.
 */
export class GoogleCalendarEngine {

  public async create(
    context: GoogleCalendarContext,
  ): Promise<GoogleCalendarResult> {

    const { createEvent } =
      await import("@/lib/connectors/google/calendar/create-event");

    const event =
      await createEvent({

        calendarId:
          context.calendarId,

        event: {

          summary:
            context.title,

          description:
            context.description,

          location:
            context.location,

          start: {

            dateTime:
              context.start.toISOString(),

          },

          end: {

            dateTime:
              context.end.toISOString(),

          },

          attendees:
            context.attendees?.map(
              email => ({
                email,
              }),
            ),

        },

        sendUpdates:
          "all",

      });

    if (!event.id) {

      throw new Error(
        "Google Calendar did not return the created event.",
      );

    }

    return {

      success:
        true,

      eventId:
        event.id,

      url:
        event.htmlLink ?? undefined,

      message:
        "Calendar event created successfully.",

      completedAt:
        new Date(),

    };

  }

  public async read(
    context: GoogleCalendarContext,
  ): Promise<GoogleCalendarResult> {

    const { listEvents } =
      await import("@/lib/connectors/google/calendar/list-events");

    const result =
      await listEvents({

        calendarId:
          context.calendarId,

        pageSize:
          20,

        timeMin:
          context.start.toISOString(),

        timeMax:
          context.end.toISOString(),

        singleEvents:
          true,

        orderBy:
          "startTime",

      });

    return {

      success: true,

      eventId:
        context.eventId ?? "",

      events:
        result.events,

      url: undefined,

      message:
        `${result.events.length} calendar event(s) loaded successfully.`,

      completedAt:
        new Date(),

    };

  }

  public async update(
    context: GoogleCalendarContext,
  ): Promise<GoogleCalendarResult> {

    const { updateEvent } =
      await import("@/lib/connectors/google/calendar/update-event");

    if (!context.eventId?.trim()) {

      throw new Error(
        "GoogleCalendarEngine.update: eventId is required.",
      );

    }

    const result =
      await updateEvent({

        calendarId:
          context.calendarId,

        eventId:
          context.eventId,

        event: {

          summary:
            context.title,

          description:
            context.description,

          location:
            context.location,

          start: {

            dateTime:
              context.start.toISOString(),

          },

          end: {

            dateTime:
              context.end.toISOString(),

          },

          attendees:
            context.attendees?.map(
              email => ({
                email,
              }),
            ),

        },

        sendUpdates:
          "none",

      });

    return {

      success:
        true,

      eventId:
        result.id ??
        context.eventId,

      url:
        result.htmlLink ??
        undefined,

      message:
        "Calendar event updated successfully.",

      completedAt:
        new Date(),

    };

  }

  public async delete(
    context: GoogleCalendarContext,
  ): Promise<GoogleCalendarResult> {

    const { deleteEvent } =
      await import("@/lib/connectors/google/calendar/delete-event");

    if (!context.eventId?.trim()) {

      throw new Error(
        "GoogleCalendarEngine.delete: eventId is required.",
      );

    }

    await deleteEvent({

      calendarId:
        context.calendarId,

      eventId:
        context.eventId,

      sendUpdates:
        "none",

    });

    return {

      success:
        true,

      eventId:
        context.eventId,

      url:
        undefined,

      message:
        "Calendar event deleted successfully.",

      completedAt:
        new Date(),

    };

  }

}