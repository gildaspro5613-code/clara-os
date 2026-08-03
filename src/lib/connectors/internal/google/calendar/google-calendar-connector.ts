/**
 * ============================================
 * CLARA OS
 * Google Calendar Connector
 * --------------------------------------------
 * File : google-calendar-connector.ts
 * Responsibility :
 * Defines the Google Calendar
 * connector contract.
 * ============================================
 */

import { Connector } from "@/lib/connectors/core/connector";
import { GoogleCalendarContext } from "./google-calendar-context";
import { GoogleCalendarResult } from "./google-calendar-result";

/**
 * Google Calendar connector.
 */
export interface GoogleCalendarConnector extends Connector {

  /**
   * Connects to Google Calendar.
   */
  connect(): Promise<void>;

  /**
   * Creates an event.
   */
  create(
    context: GoogleCalendarContext,
  ): Promise<GoogleCalendarResult>;

  /**
   * Reads events.
   */
  read(
    context: GoogleCalendarContext,
  ): Promise<GoogleCalendarResult>;

  /**
   * Updates an event.
   */
  update(
    context: GoogleCalendarContext,
  ): Promise<GoogleCalendarResult>;

  /**
   * Deletes an event.
   */
  delete(
    context: GoogleCalendarContext,
  ): Promise<GoogleCalendarResult>;

}