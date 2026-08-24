/**
 * ============================================
 * CLARA OS
 * Delete Calendar Event Capability
 * --------------------------------------------
 * Responsibility :
 * Deletes an event from the workspace calendar.
 * ============================================
 */

export const DELETE_CALENDAR_EVENT_CAPABILITY =
  "delete-calendar-event";

export interface DeleteCalendarEventCapability {

  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly category: string;

}

export const DeleteCalendarEventCapabilityDefinition:
  DeleteCalendarEventCapability = {

  id:
    DELETE_CALENDAR_EVENT_CAPABILITY,

  name:
    "Delete Calendar Event",

  description:
    "Deletes an event from the workspace Google Calendar.",

  version:
    "1.0.0",

  category:
    "Workspace",

};
