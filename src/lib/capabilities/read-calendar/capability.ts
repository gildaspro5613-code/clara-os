/**
 * ============================================
 * CLARA OS
 * Read Calendar Capability
 * --------------------------------------------
 * Responsibility :
 * Reads events from the workspace calendar.
 * ============================================
 */

export const READ_CALENDAR_CAPABILITY =
  "read-calendar";

export interface ReadCalendarCapability {

  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly category: string;

}

export const ReadCalendarCapabilityDefinition:
  ReadCalendarCapability = {

  id:
    READ_CALENDAR_CAPABILITY,

  name:
    "Read Calendar",

  description:
    "Reads events from the workspace Google Calendar.",

  version:
    "1.0.0",

  category:
    "Workspace",

};
