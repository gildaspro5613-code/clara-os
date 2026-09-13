/**
 * ============================================
 * CLARA OS
 * Google Workspace Connector
 * --------------------------------------------
 * File : google-workspace-connector.ts
 * Responsibility :
 * Adapts the existing Google Workspace API
 * operations to the Clara OS Connector contract.
 * ============================================
 */

import type { Connector } from "../core/connector";
import type { ConnectorContext } from "../core/connector-context";
import type { ConnectorEvent } from "../core/connector-event";
import type { ConnectorResult } from "../core/connector-result";

import {
  createEvent,
  deleteEvent,
  getEvent,
  listCalendars,
  listEvents,
  updateEvent,
  type CreateEventOptions,
  type DeleteEventOptions,
  type GetEventOptions,
  type ListCalendarsOptions,
  type ListEventsOptions,
  type UpdateEventOptions,
} from "./calendar";

import {
  createDocument,
  exportPdf,
  getDocument,
  insertImage,
  insertTable,
  insertText,
  replaceText,
  updateDocument,
  type CreateDocumentOptions,
  type ExportPdfOptions,
  type GetDocumentOptions,
  type InsertImageOptions,
  type InsertTableOptions,
  type InsertTextOptions,
  type ReplaceTextOptions,
  type UpdateDocumentOptions,
} from "./docs";

import {
  createFolder,
  deleteFile,
  downloadFile,
  listFiles,
  moveFile,
  updateFile,
  uploadFile,
  type CreateFolderOptions,
  type DeleteFileOptions,
  type DownloadFileOptions,
  type ListFilesOptions,
  type MoveFileOptions,
  type UpdateFileOptions,
  type UploadFileOptions,
} from "./drive";

import {
  deleteMessage,
  draftMessage,
  getMessage,
  listLabels,
  listMessages,
  modifyLabels,
  sendMessage,
  type DeleteMessageOptions,
  type DraftMessageOptions,
  type GetMessageOptions,
  type ListLabelsOptions,
  type ListMessagesOptions,
  type ModifyLabelsOptions,
  type SendMessageOptions,
} from "./gmail";

import {
  appendRow,
  clearRange,
  createSheet,
  deleteSheet,
  getSheet,
  readRange,
  updateRange,
  writeRange,
  type AppendRowOptions,
  type ClearRangeOptions,
  type CreateSheetOptions,
  type DeleteSheetOptions,
  type GetSheetOptions,
  type ReadRangeOptions,
  type UpdateRangeOptions,
  type WriteRangeOptions,
} from "./sheets";

export const GOOGLE_WORKSPACE_CAPABILITIES = [
  "google.calendar.listCalendars",
  "google.calendar.listEvents",
  "google.calendar.getEvent",
  "google.calendar.createEvent",
  "google.calendar.updateEvent",
  "google.calendar.deleteEvent",
  "google.docs.createDocument",
  "google.docs.getDocument",
  "google.docs.updateDocument",
  "google.docs.replaceText",
  "google.docs.insertText",
  "google.docs.insertTable",
  "google.docs.insertImage",
  "google.docs.exportPdf",
  "google.drive.createFolder",
  "google.drive.listFiles",
  "google.drive.uploadFile",
  "google.drive.downloadFile",
  "google.drive.updateFile",
  "google.drive.moveFile",
  "google.drive.deleteFile",
  "google.gmail.listMessages",
  "google.gmail.getMessage",
  "google.gmail.sendMessage",
  "google.gmail.draftMessage",
  "google.gmail.deleteMessage",
  "google.gmail.modifyLabels",
  "google.gmail.listLabels",
  "google.sheets.getSheet",
  "google.sheets.readRange",
  "google.sheets.writeRange",
  "google.sheets.appendRow",
  "google.sheets.updateRange",
  "google.sheets.clearRange",
  "google.sheets.createSheet",
  "google.sheets.deleteSheet",
] as const;

/**
 * Executable Google Workspace connector.
 *
 * The underlying Google service functions remain the source of truth for API
 * behaviour. This adapter only exposes them through the standardized Clara OS
 * connector execution contract.
 */
export class GoogleWorkspaceConnector implements Connector {

  public readonly id = "google-workspace";

  public readonly name = "Google Workspace";

  public readonly version = "1.0.0";

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
      case "google.calendar.listCalendars":
        return listCalendars(event.payload as ListCalendarsOptions);
      case "google.calendar.listEvents":
        return listEvents(event.payload as ListEventsOptions);
      case "google.calendar.getEvent":
        return getEvent(event.payload as GetEventOptions);
      case "google.calendar.createEvent":
        return createEvent(event.payload as CreateEventOptions);
      case "google.calendar.updateEvent":
        return updateEvent(event.payload as UpdateEventOptions);
      case "google.calendar.deleteEvent":
        return deleteEvent(event.payload as DeleteEventOptions);

      case "google.docs.createDocument":
        return createDocument(event.payload as CreateDocumentOptions);
      case "google.docs.getDocument":
        return getDocument(event.payload as GetDocumentOptions);
      case "google.docs.updateDocument":
        return updateDocument(event.payload as UpdateDocumentOptions);
      case "google.docs.replaceText":
        return replaceText(event.payload as ReplaceTextOptions);
      case "google.docs.insertText":
        return insertText(event.payload as InsertTextOptions);
      case "google.docs.insertTable":
        return insertTable(event.payload as InsertTableOptions);
      case "google.docs.insertImage":
        return insertImage(event.payload as InsertImageOptions);
      case "google.docs.exportPdf":
        return exportPdf(event.payload as ExportPdfOptions);

      case "google.drive.createFolder":
        return createFolder(event.payload as CreateFolderOptions);
      case "google.drive.listFiles":
        return listFiles(event.payload as ListFilesOptions);
      case "google.drive.uploadFile":
        return uploadFile(event.payload as UploadFileOptions);
      case "google.drive.downloadFile":
        return downloadFile(event.payload as DownloadFileOptions);
      case "google.drive.updateFile":
        return updateFile(event.payload as UpdateFileOptions);
      case "google.drive.moveFile":
        return moveFile(event.payload as MoveFileOptions);
      case "google.drive.deleteFile":
        return deleteFile(event.payload as DeleteFileOptions);

      case "google.gmail.listMessages":
        return listMessages(event.payload as ListMessagesOptions);
      case "google.gmail.getMessage":
        return getMessage(event.payload as GetMessageOptions);
      case "google.gmail.sendMessage":
        return sendMessage(event.payload as SendMessageOptions);
      case "google.gmail.draftMessage":
        return draftMessage(event.payload as DraftMessageOptions);
      case "google.gmail.deleteMessage":
        return deleteMessage(event.payload as DeleteMessageOptions);
      case "google.gmail.modifyLabels":
        return modifyLabels(event.payload as ModifyLabelsOptions);
      case "google.gmail.listLabels":
        return listLabels(event.payload as ListLabelsOptions);

      case "google.sheets.getSheet":
        return getSheet(event.payload as GetSheetOptions);
      case "google.sheets.readRange":
        return readRange(event.payload as ReadRangeOptions);
      case "google.sheets.writeRange":
        return writeRange(event.payload as WriteRangeOptions);
      case "google.sheets.appendRow":
        return appendRow(event.payload as AppendRowOptions);
      case "google.sheets.updateRange":
        return updateRange(event.payload as UpdateRangeOptions);
      case "google.sheets.clearRange":
        return clearRange(event.payload as ClearRangeOptions);
      case "google.sheets.createSheet":
        return createSheet(event.payload as CreateSheetOptions);
      case "google.sheets.deleteSheet":
        return deleteSheet(event.payload as DeleteSheetOptions);

      default:
        throw new Error(`Unsupported Google Workspace capability: ${event.capability}.`);
    }
  }
}
