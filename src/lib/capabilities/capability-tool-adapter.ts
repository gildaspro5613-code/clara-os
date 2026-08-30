/**
 * ============================================
 * CLARA OS
 * Capability Tool Adapter
 * --------------------------------------------
 * Converts Clara capabilities into generic
 * tool definitions consumable by a cognitive
 * model.
 * ============================================
 */

import type { CapabilityDefinition } from "./capability-registry";

/**
 * Generic parameter definition.
 */
export interface CapabilityToolParameter {
  readonly type: string;
  readonly description: string;
  readonly required: boolean;
}

/**
 * Generic tool definition.
 *
 * This contract deliberately does not depend
 * on OpenAI or any specific model provider.
 */
export interface CapabilityToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<
    string,
    CapabilityToolParameter
  >;
}

/**
 * Converts a registered capability into a
 * model-facing tool definition.
 */
export function toCapabilityTool(
  capability: CapabilityDefinition,
): CapabilityToolDefinition {

  if ("inputSchema" in capability && capability.inputSchema) {
    return {
      name: capability.id,
      description: capability.description,
      parameters: capability.inputSchema,
    };
  }

  switch (capability.id) {

    case "read-sheet":
      return {
        name: capability.id,
        description: capability.description,
        parameters: {
          role: {
            type: "string",
            description:
              "Workspace spreadsheet role to read: crm, prospects, clients, or production.",
            required: true,
          },
          range: {
            type: "string",
            description:
              "Google Sheets A1 range to read, for example A1:Z10.",
            required: true,
          },
        },
      };

    case "read-calendar":
      return {
        name: capability.id,
        description: capability.description,
        parameters: {
          timeMin: {
            type: "string",
            description:
              "Optional lower time boundary in ISO 8601 format.",
            required: false,
          },
          timeMax: {
            type: "string",
            description:
              "Optional upper time boundary in ISO 8601 format.",
            required: false,
          },
        },
      };

    case "create-calendar-event":
      return {
        name: capability.id,
        description: capability.description,
        parameters: {
          title: {
            type: "string",
            description: "Calendar event title.",
            required: true,
          },
          description: {
            type: "string",
            description: "Optional calendar event description.",
            required: false,
          },
          location: {
            type: "string",
            description: "Optional event location.",
            required: false,
          },
          start: {
            type: "string",
            description: "Event start in ISO 8601 format.",
            required: true,
          },
          end: {
            type: "string",
            description: "Event end in ISO 8601 format.",
            required: true,
          },
          attendees: {
            type: "array",
            description: "Optional attendee email addresses.",
            required: false,
          },
        },
      };

    case "update-calendar-event":
      return {
        name: capability.id,
        description: capability.description,
        parameters: {
          eventId: {
            type: "string",
            description: "Google Calendar event identifier to update.",
            required: true,
          },
          title: {
            type: "string",
            description: "Updated event title.",
            required: false,
          },
          description: {
            type: "string",
            description: "Updated event description.",
            required: false,
          },
          location: {
            type: "string",
            description: "Updated event location.",
            required: false,
          },
          start: {
            type: "string",
            description: "Updated event start in ISO 8601 format.",
            required: false,
          },
          end: {
            type: "string",
            description: "Updated event end in ISO 8601 format.",
            required: false,
          },
          attendees: {
            type: "array",
            description: "Updated attendee email addresses.",
            required: false,
          },
        },
      };

    case "delete-calendar-event":
      return {
        name: capability.id,
        description: capability.description,
        parameters: {
          eventId: {
            type: "string",
            description:
              "Google Calendar event identifier to delete.",
            required: true,
          },
        },
      };

    case "send-gmail":
      return {
        name: capability.id,
        description: capability.description,
        parameters: {
          to: {
            type: "string",
            description: "Recipient email address.",
            required: true,
          },
          cc: {
            type: "array",
            description: "Optional CC recipient email addresses.",
            required: false,
          },
          bcc: {
            type: "array",
            description: "Optional BCC recipient email addresses.",
            required: false,
          },
          subject: {
            type: "string",
            description: "Email subject.",
            required: true,
          },
          body: {
            type: "string",
            description: "Plain-text email body.",
            required: true,
          },
        },
      };

    case "read-gmail":
      return {
        name: capability.id,
        description: capability.description,
        parameters: {
          query: {
            type: "string",
            description:
              "Optional Gmail search query, for example is:unread or from:client@example.com.",
            required: false,
          },
        },
      };

    case "organize-drive":
      return {
        name: capability.id,
        description: capability.description,
        parameters: {
          fileId: {
            type: "string",
            description:
              "Google Drive file identifier of the file to organize.",
            required: true,
          },
          folderName: {
            type: "string",
            description:
              "Target Google Drive folder name.",
            required: true,
          },
          parentFolderId: {
            type: "string",
            description:
              "Optional Google Drive parent folder identifier.",
            required: false,
          },
        },
      };

    default:
      return {
        name: capability.id,
        description: capability.description,
        parameters: {},
      };
  }
}

/**
 * Converts a complete capability catalog
 * into model-facing tool definitions.
 */
export function toCapabilityTools(
  capabilities: CapabilityDefinition[],
): CapabilityToolDefinition[] {

  return capabilities.map(
    capability => toCapabilityTool(capability),
  );

}
