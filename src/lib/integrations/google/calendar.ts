/**
 * ============================================
 * CLARA OS
 * Google Calendar Integration
 * --------------------------------------------
 * File : calendar.ts
 * Responsibility :
 * Provides access to the
 * Google Calendar API.
 * ============================================
 */

import { google } from "googleapis";

import { GoogleIntegration } from "./auth";
import {
  listCalendars,
} from "@/lib/connectors/google/calendar";

/**
 * Google Calendar integration.
 */
export class GoogleCalendarIntegration {

  /**
   * Google Calendar API.
   */
  private readonly calendar;

  /**
   * Constructor.
   */
  constructor() {

    const auth = GoogleIntegration.createClient();

    this.calendar = google.calendar({

      version: "v3",

      auth,

    });

  }

  /**
   * Lists accessible Google calendars.
   */
  public async listCalendars() {

    return listCalendars();

  }

  /**
   * Creates one calendar.
   */
  public async createCalendar(
    summary: string,
  ): Promise<string> {

    const response =
      await this.calendar.calendars.insert({

        requestBody: {

          summary,

        },

      });

    return response.data.id ?? "";

  }

  /**
   * Returns one calendar.
   */
  public async getCalendar(
    calendarId: string,
  ) {

    return this.calendar.calendars.get({

      calendarId,

    });

  }

}