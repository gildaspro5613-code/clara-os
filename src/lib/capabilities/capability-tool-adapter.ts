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

export interface CapabilityToolParameter {
  readonly type: string;
  readonly description: string;
  readonly required: boolean;
}

export interface CapabilityToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, CapabilityToolParameter>;
}

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

  const tool = (
    parameters: Record<string, CapabilityToolParameter>,
  ): CapabilityToolDefinition => ({
    name: capability.id,
    description: capability.description,
    parameters,
  });

  switch (capability.id) {
    case "read-sheet":
      return tool({
        role: spreadsheetRole(true),
        range: a1Range(true),
      });

    case "find-sheet-row":
      return tool({
        role: spreadsheetRole(true),
        range: a1Range(true),
        column: {
          type: "string",
          description: "Header name of the column to search.",
          required: true,
        },
        value: {
          type: "string",
          description: "Exact value to find in the selected column.",
          required: true,
        },
      });

    case "append-sheet-row":
      return tool({
        role: spreadsheetRole(true),
        range: a1Range(true),
        rows: {
          type: "array",
          description: "Rows of values to append to the Google Sheet.",
          required: true,
        },
      });

    case "update-sheet-row":
      return tool({
        role: spreadsheetRole(true),
        range: a1Range(true),
        values: {
          type: "array",
          description: "Matrix of values to write into the target range.",
          required: true,
        },
      });

    case "delete-sheet-row":
      return tool({
        role: spreadsheetRole(true),
        sheetName: {
          type: "string",
          description: "Worksheet tab name.",
          required: true,
        },
        rowIndex: {
          type: "number",
          description: "One-based Google Sheets row index to delete.",
          required: true,
        },
      });

    case "read-calendar":
      return tool({
        timeMin: {
          type: "string",
          description: "Optional lower time boundary in ISO 8601 format.",
          required: false,
        },
        timeMax: {
          type: "string",
          description: "Optional upper time boundary in ISO 8601 format.",
          required: false,
        },
      });

    case "create-calendar-event":
      return tool(calendarEventParameters(true));

    case "update-calendar-event":
      return tool({
        eventId: {
          type: "string",
          description: "Google Calendar event identifier to update.",
          required: true,
        },
        ...calendarEventParameters(false),
      });

    case "delete-calendar-event":
      return tool({
        eventId: {
          type: "string",
          description: "Google Calendar event identifier to delete.",
          required: true,
        },
      });

    case "send-gmail":
      return tool({
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
          required: false,
        },
        body: {
          type: "string",
          description: "Plain-text email body.",
          required: true,
        },
      });

    case "read-gmail":
      return tool({
        query: {
          type: "string",
          description:
            "Optional Gmail search query, for example is:unread or from:client@example.com.",
          required: false,
        },
      });

    case "organize-drive":
      return tool({
        fileId: {
          type: "string",
          description: "Google Drive file identifier of the file to organize.",
          required: true,
        },
        folderName: {
          type: "string",
          description: "Target Google Drive folder name.",
          required: true,
        },
        parentFolderId: {
          type: "string",
          description: "Optional Google Drive parent folder identifier.",
          required: false,
        },
      });

    case "find-document":
      return tool({
        name: {
          type: "string",
          description: "Exact Google Document name to find in Drive.",
          required: true,
        },
      });

    case "read-document":
      return tool({
        documentId: {
          type: "string",
          description: "Google Document identifier to read.",
          required: true,
        },
        title: {
          type: "string",
          description: "Optional known document title.",
          required: false,
        },
      });

    default:
      return tool({});
  }
}

function spreadsheetRole(required: boolean): CapabilityToolParameter {
  return {
    type: "string",
    description:
      "Workspace spreadsheet role: crm, prospects, clients, or production.",
    required,
  };
}

function a1Range(required: boolean): CapabilityToolParameter {
  return {
    type: "string",
    description: "Google Sheets A1 range, for example A1:Z10.",
    required,
  };
}

function calendarEventParameters(
  create: boolean,
): Record<string, CapabilityToolParameter> {
  return {
    title: {
      type: "string",
      description: create ? "Calendar event title." : "Updated event title.",
      required: create,
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
      required: create,
    },
    end: {
      type: "string",
      description: "Event end in ISO 8601 format.",
      required: create,
    },
    attendees: {
      type: "array",
      description: "Optional attendee email addresses.",
      required: false,
    },
  };
}

export function toCapabilityTools(
  capabilities: CapabilityDefinition[],
): CapabilityToolDefinition[] {
  return capabilities.map((capability) => toCapabilityTool(capability));
}
