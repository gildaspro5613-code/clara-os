/**
 * ============================================
 * CLARA OS
 * Update Calendar Event Capability
 * --------------------------------------------
 * Responsibility :
 * Updates an event in the workspace calendar.
 * ============================================
 */

export const UPDATE_CALENDAR_EVENT_CAPABILITY =
  "update-calendar-event";

export interface UpdateCalendarEventCapability {

  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly category: string;

}

export const UpdateCalendarEventCapabilityDefinition:
  UpdateCalendarEventCapability = {

  id:
    UPDATE_CALENDAR_EVENT_CAPABILITY,

  name:
    "Update Calendar Event",

  description:
    "Updates an existing event in the workspace Google Calendar.",

  version:
    "1.0.0",

  category:
    "Workspace",

};
