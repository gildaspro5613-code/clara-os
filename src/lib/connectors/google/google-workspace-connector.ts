/**
 * ============================================
 * CLARA OS
 * Google Workspace Connector
 * --------------------------------------------
 * File : google-workspace-connector.ts
 * Responsibility :
 * Adapts Clara workspace capabilities to the
 * existing Google Workspace API operations.
 * ============================================
 */

import type { calendar_v3 } from "googleapis";

import type { ExecutableConnector } from "../core/connector";
import type { ConnectorContext } from "../core/connector-context";
import type { ConnectorEvent } from "../core/connector-event";
import type { ConnectorResult } from "../core/connector-result";

import {
  createEvent,
  deleteEvent,
  listEvents,
  updateEvent,
} from "./calendar";
import { getDocument } from "./docs";
import { createFolder, listFiles, moveFile } from "./drive";
import {
  getMessage,
  listMessages,
  sendMessage,
} from "./gmail";
import {
  appendRow,
  deleteRow,
  getSheet,
  readRange,
  updateRange,
} from "./sheets";

import type { AppendSheetRowContext } from "@/lib/capabilities/append-sheet-row/context";
import type { CreateCalendarEventContext } from "@/lib/capabilities/create-calendar-event/context";
import type { DeleteCalendarEventContext } from "@/lib/capabilities/delete-calendar-event/context";
import type { DeleteSheetRowContext } from "@/lib/capabilities/delete-sheet-row/context";
import type { FindDocumentContext } from "@/lib/capabilities/find-document/context";
import type { FindSheetRowContext } from "@/lib/capabilities/find-sheet-row/context";
import type { OrganizeDriveContext } from "@/lib/capabilities/organize-drive/context";
import type { ReadCalendarContext } from "@/lib/capabilities/read-calendar/context";
import type { ReadDocumentContext } from "@/lib/capabilities/read-document/context";
import type { ReadGmailContext } from "@/lib/capabilities/read-gmail/context";
import type { ReadSheetContext } from "@/lib/capabilities/read-sheet/context";
import type { SendGmailContext } from "@/lib/capabilities/send-gmail/context";
import type { UpdateCalendarEventContext } from "@/lib/capabilities/update-calendar-event/context";
import type { UpdateSheetRowContext } from "@/lib/capabilities/update-sheet-row/context";
import {
  getWorkspaceCalendar,
  getWorkspaceFolder,
  getWorkspaceSpreadsheet,
} from "@/lib/core/workspace/workspace-resolver";

const GOOGLE_DOCUMENT_MIME_TYPE = "application/vnd.google-apps.document";

export const GOOGLE_WORKSPACE_CAPABILITIES = [
  "search-drive",
  "organize-drive",
  "read-sheet",
  "find-sheet-row",
  "append-sheet-row",
  "update-sheet-row",
  "delete-sheet-row",
  "read-calendar",
  "create-calendar-event",
  "update-calendar-event",
  "delete-calendar-event",
  "read-gmail",
  "send-gmail",
  "find-document",
  "read-document",
] as const;

type WorkspaceSpreadsheetRole = ReadSheetContext["role"];

/**
 * Executable Google Workspace connector.
 *
 * Clara keeps provider-neutral capability names. This adapter resolves the
 * workspace resources hidden behind those names, then delegates to the
 * existing Google service functions. Runtime and the Autonomy Gate remain
 * responsible for deciding when an operation may execute.
 */
export class GoogleWorkspaceConnector implements ExecutableConnector {
  public readonly id = "google-workspace";
  public readonly name = "Google Workspace";
  public readonly version = "1.1.0";
  public readonly capabilities: string[] = [...GOOGLE_WORKSPACE_CAPABILITIES];

  public constructor(
    public readonly context: ConnectorContext,
    public enabled = true,
  ) {}

  public async execute(event: ConnectorEvent): Promise<ConnectorResult> {
    const data = await this.executeCapability(event);

    return {
      success: true,
      capability: event.capability,
      data,
      message: `${event.capability} executed successfully.`,
      completedAt: new Date(),
    };
  }

  private async executeCapability(event: ConnectorEvent): Promise<unknown> {
    switch (event.capability) {
      case "search-drive":
        return this.searchDrive(event.payload as import("@/lib/capabilities/drive-search/context").DriveSearchContext);
      case "organize-drive":
        return this.organizeDrive(event.payload as OrganizeDriveContext);
      case "read-sheet":
        return this.readSheet(event.payload as ReadSheetContext);
      case "find-sheet-row":
        return this.findSheetRow(event.payload as FindSheetRowContext);
      case "append-sheet-row":
        return this.appendSheetRow(event.payload as AppendSheetRowContext);
      case "update-sheet-row":
        return this.updateSheetRow(event.payload as UpdateSheetRowContext);
      case "delete-sheet-row":
        return this.deleteSheetRow(event.payload as DeleteSheetRowContext);
      case "read-calendar":
        return this.readCalendar(event.payload as ReadCalendarContext);
      case "create-calendar-event":
        return this.createCalendarEvent(event.payload as CreateCalendarEventContext);
      case "update-calendar-event":
        return this.updateCalendarEvent(event.payload as UpdateCalendarEventContext);
      case "delete-calendar-event":
        return this.deleteCalendarEvent(event.payload as DeleteCalendarEventContext);
      case "read-gmail":
        return this.readGmail(event.payload as ReadGmailContext);
      case "send-gmail":
        return this.sendGmail(event.payload as SendGmailContext);
      case "find-document":
        return this.findDocument(event.payload as FindDocumentContext);
      case "read-document":
        return this.readDocument(event.payload as ReadDocumentContext);
      default:
        throw new Error(
          `Unsupported Google Workspace capability: ${event.capability}.`,
        );
    }
  }

  private async searchDrive(
    input: import("@/lib/capabilities/drive-search/context").DriveSearchContext,
  ): Promise<unknown> {
    if (input.operation === "search") {
      const query = input.query?.trim();
      if (!query) throw new Error("search-drive: query is required for search.");
      const escaped = query.replaceAll("'", "\\'");
      return listFiles({
        pageSize: 100,
        query: `name contains '${escaped}' and trashed=false`,
      });
    }

    if (input.operation === "list") {
      if (!input.folderId?.trim()) {
        throw new Error("search-drive: folderId is required for list.");
      }
      return listFiles({
        pageSize: 100,
        query: `'${input.folderId.trim()}' in parents and trashed=false`,
      });
    }

    if (input.operation === "read") {
      if (!input.fileId?.trim()) {
        throw new Error("search-drive: fileId is required for read.");
      }
      if (input.mimeType === GOOGLE_DOCUMENT_MIME_TYPE) {
        return getDocument({ documentId: input.fileId.trim() });
      }
      throw new Error(
        "search-drive: generic binary file reads remain handled by the existing Drive reader.",
      );
    }

    throw new Error(`search-drive: unsupported operation ${input.operation}.`);
  }

  private async organizeDrive(input: OrganizeDriveContext): Promise<unknown> {
    const fileId = input.fileId.trim();
    const folderName = input.folderName.trim();
    if (!fileId) throw new Error("organize-drive: fileId is required.");
    if (!folderName) throw new Error("organize-drive: folderName is required.");

    const workspaceFolder = await getWorkspaceFolder(folderName);
    let destinationFolderId = workspaceFolder?.folderId;

    if (!destinationFolderId) {
      const escaped = folderName.replaceAll("'", "\\'");
      const parentClause = input.parentFolderId
        ? ` and '${input.parentFolderId}' in parents`
        : "";
      const existing = await listFiles({
        pageSize: 1,
        query:
          `name='${escaped}' and mimeType='application/vnd.google-apps.folder'` +
          `${parentClause} and trashed=false`,
      });
      destinationFolderId = existing.files[0]?.id;
    }

    if (!destinationFolderId) {
      const created = await createFolder({
        name: folderName,
        parentId: input.parentFolderId,
      });
      destinationFolderId = created.id;
    }

    return moveFile({ fileId, destinationFolderId });
  }

  private async resolveSpreadsheet(role: WorkspaceSpreadsheetRole) {
    const spreadsheet = await getWorkspaceSpreadsheet(role);
    if (!spreadsheet) {
      throw new Error(`Workspace spreadsheet not found for role "${role}".`);
    }
    return spreadsheet;
  }

  private async readSheet(input: ReadSheetContext): Promise<unknown> {
    const spreadsheet = await this.resolveSpreadsheet(input.role);
    return readRange({
      spreadsheetId: spreadsheet.spreadsheetId,
      range: input.range,
    });
  }

  private async findSheetRow(input: FindSheetRowContext): Promise<unknown> {
    const spreadsheet = await this.resolveSpreadsheet(input.role);
    const result = await readRange({
      spreadsheetId: spreadsheet.spreadsheetId,
      range: input.range,
    });
    const headers = result.values[0]?.map((value) => String(value).trim()) ?? [];
    const columnIndex = headers.findIndex(
      (header) => header.toLowerCase() === input.column.trim().toLowerCase(),
    );
    if (columnIndex === -1) {
      throw new Error(`Column "${input.column}" not found.`);
    }
    const expected = input.value.trim().toLowerCase();
    const matches = result.values
      .slice(1)
      .map((row, index) => ({ row, rowIndex: index + 2 }))
      .filter(
        ({ row }) => String(row[columnIndex] ?? "").trim().toLowerCase() === expected,
      );
    return {
      rows: matches.map(({ row }) => row),
      rowIndexes: matches.map(({ rowIndex }) => rowIndex),
    };
  }

  private async appendSheetRow(input: AppendSheetRowContext): Promise<unknown> {
    const spreadsheet = await this.resolveSpreadsheet(input.role);
    return appendRow({
      spreadsheetId: spreadsheet.spreadsheetId,
      range: input.range,
      rows: input.rows as (string | number | boolean | null)[][],
    });
  }

  private async updateSheetRow(input: UpdateSheetRowContext): Promise<unknown> {
    const spreadsheet = await this.resolveSpreadsheet(input.role);
    return updateRange({
      spreadsheetId: spreadsheet.spreadsheetId,
      updates: [
        {
          range: input.range,
          values: input.values as (string | number | boolean | null)[][],
        },
      ],
    });
  }

  private async deleteSheetRow(input: DeleteSheetRowContext): Promise<unknown> {
    const spreadsheet = await this.resolveSpreadsheet(input.role);
    const metadata = await getSheet({ spreadsheetId: spreadsheet.spreadsheetId });
    const sheet = metadata.sheets?.find(
      (candidate) => candidate.properties?.title === input.sheetName,
    );
    const sheetId = sheet?.properties?.sheetId;
    if (sheetId === null || sheetId === undefined) {
      throw new Error(`Worksheet "${input.sheetName}" not found.`);
    }
    await deleteRow({
      spreadsheetId: spreadsheet.spreadsheetId,
      sheetId,
      startIndex: input.rowIndex - 1,
      endIndex: input.rowIndex,
    });
    return { deletedRow: input.rowIndex };
  }

  private async resolveCalendarId(): Promise<string> {
    const calendar = await getWorkspaceCalendar();
    if (!calendar) throw new Error("Workspace calendar not found.");
    return calendar.calendarId;
  }

  private async readCalendar(input: ReadCalendarContext): Promise<unknown> {
    const calendarId = await this.resolveCalendarId();
    return listEvents({
      calendarId,
      pageSize: 20,
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });
  }

  private async createCalendarEvent(
    input: CreateCalendarEventContext,
  ): Promise<unknown> {
    const calendarId = await this.resolveCalendarId();
    const start = new Date(input.start);
    const end = new Date(input.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Calendar event start and end must be valid dates.");
    }
    if (end <= start) throw new Error("Calendar event end must be after start.");

    return createEvent({
      calendarId,
      event: {
        summary: input.title.trim(),
        description: input.description,
        location: input.location,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: input.attendees?.map((email) => ({ email })),
      },
      sendUpdates: "all",
    });
  }

  private async updateCalendarEvent(
    input: UpdateCalendarEventContext,
  ): Promise<unknown> {
    const calendarId = await this.resolveCalendarId();
    const event: calendar_v3.Schema$Event = {};

    if (input.title !== undefined) event.summary = input.title.trim();
    if (input.description !== undefined) event.description = input.description;
    if (input.location !== undefined) event.location = input.location;
    if (input.start !== undefined) {
      const start = new Date(input.start);
      if (Number.isNaN(start.getTime())) throw new Error("Event start must be a valid date.");
      event.start = { dateTime: start.toISOString() };
    }
    if (input.end !== undefined) {
      const end = new Date(input.end);
      if (Number.isNaN(end.getTime())) throw new Error("Event end must be a valid date.");
      event.end = { dateTime: end.toISOString() };
    }
    if (input.attendees !== undefined) {
      event.attendees = input.attendees.map((email) => ({ email }));
    }
    if (Object.keys(event).length === 0) {
      throw new Error("At least one event field must be provided for update.");
    }

    return updateEvent({
      calendarId,
      eventId: input.eventId,
      event,
      sendUpdates: "none",
    });
  }

  private async deleteCalendarEvent(
    input: DeleteCalendarEventContext,
  ): Promise<unknown> {
    const calendarId = await this.resolveCalendarId();
    await deleteEvent({
      calendarId,
      eventId: input.eventId,
      sendUpdates: "none",
    });
    return { eventId: input.eventId };
  }

  private async readGmail(input: ReadGmailContext): Promise<unknown> {
    const listed = await listMessages({
      pageSize: 20,
      query: input.query,
    });
    const messages = await Promise.all(
      listed.messages
        .filter((message) => Boolean(message.id))
        .map((message) =>
          getMessage({ messageId: message.id!, format: "full" }),
        ),
    );
    return messages.map(projectGmailMessage);
  }

  private async sendGmail(input: SendGmailContext): Promise<unknown> {
    return sendMessage({
      recipients: {
        to: [input.to],
        cc: input.cc,
        bcc: input.bcc,
      },
      subject: input.subject,
      textBody: input.body,
    });
  }

  private async findDocument(input: FindDocumentContext): Promise<unknown> {
    const name = input.name.trim();
    if (!name) throw new Error("Document name is required.");
    const escaped = name.replaceAll("'", "\\'");
    const result = await listFiles({
      pageSize: 10,
      query:
        `name='${escaped}' and ` +
        `mimeType='${GOOGLE_DOCUMENT_MIME_TYPE}' and trashed=false`,
    });
    return result.files[0] ?? null;
  }

  private async readDocument(input: ReadDocumentContext): Promise<unknown> {
    const document = await getDocument({ documentId: input.documentId });
    return {
      documentId: input.documentId,
      title: document.title ?? input.title ?? "",
      content: extractDocumentText(document),
    };
  }
}

function projectGmailMessage(
  message: import("googleapis").gmail_v1.Schema$Message,
) {
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? undefined;

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    snippet: message.snippet ?? "",
    labelIds: message.labelIds ?? [],
  };
}

function extractDocumentText(document: import("googleapis").docs_v1.Schema$Document) {
  return (document.body?.content ?? [])
    .flatMap((item) => item.paragraph?.elements ?? [])
    .map((element) => element.textRun?.content ?? "")
    .join("");
}
