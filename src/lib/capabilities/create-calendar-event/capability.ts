/**
 * ============================================
 * CLARA OS
 * Create Calendar Event Capability
 * --------------------------------------------
 * Responsibility :
 * Creates an event in the workspace calendar.
 * ============================================
 */

export const CREATE_CALENDAR_EVENT_CAPABILITY =
  "create-calendar-event";

export interface CreateCalendarEventCapability {

  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly category: string;

}

export const CreateCalendarEventCapabilityDefinition:
  CreateCalendarEventCapability = {

  id:
    CREATE_CALENDAR_EVENT_CAPABILITY,

  name:
    "Create Calendar Event",

  description:
    "Creates an event in the workspace Google Calendar.",

  version:
    "1.0.0",

  category:
    "Workspace",

};
