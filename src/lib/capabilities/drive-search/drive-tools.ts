/**
 * ============================================
 * CLARA OS
 * Drive Tools
 * --------------------------------------------
 * File : drive-tools.ts
 * Responsibility :
 * Defines the OpenAI Responses API tools
 * that expose Google Drive capabilities
 * to the model.
 * ============================================
 */

import type { FunctionTool } from "openai/resources/responses/responses";
import { DriveSearchWorkflow } from "@/lib/capabilities/drive-search/workflow";
import type { DriveSearchContext } from "@/lib/capabilities/drive-search/context";
import { DriveContextBuilder } from "@/lib/capabilities/drive-search/drive-context-builder";

/**
 * Google Drive tools exposed to the OpenAI model.
 */
export const DRIVE_TOOLS: FunctionTool[] = [

  {
    type: "function",
    name: "search_drive",
    description:
      "Search for files or folders in the user's Google Drive by name. " +
      "Returns a list of matching resources with their IDs, names, MIME types, and links. " +
      "Use this when the user asks to find, locate, or open a Drive resource.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The name or partial name of the file or folder to search for (e.g. 'RTSE Angers', 'Melodie Digital').",
        },
      },
      required: ["query"],
    },
    strict: null,
  },

  {
    type: "function",
    name: "list_folder",
    description:
      "List the contents of a specific Google Drive folder by its ID. " +
      "Returns all files and sub-folders inside it. " +
      "Use this after resolving a folder ID with search_drive.",
    parameters: {
      type: "object",
      properties: {
        folder_id: {
          type: "string",
          description: "The Google Drive folder ID to list the contents of.",
        },
      },
      required: ["folder_id"],
    },
    strict: null,
  },

  {
    type: "function",
    name: "read_file",
    description:
      "Read the plain-text content of a Google Workspace document (Google Docs, Sheets, Slides). " +
      "Returns the extracted text content. " +
      "Only use this for Google Workspace document types; binary files are not supported.",
    parameters: {
      type: "object",
      properties: {
        file_id: {
          type: "string",
          description: "The Google Drive file ID to read.",
        },
        mime_type: {
          type: "string",
          description:
            "The MIME type of the file (e.g. 'application/vnd.google-apps.document').",
        },
      },
      required: ["file_id"],
    },
    strict: null,
  },

];

/** Module-level singletons — shared across all agentic loop iterations. */
const _workflow = new DriveSearchWorkflow();
const _contextBuilder = new DriveContextBuilder();

/**
 * Executes a Drive tool call and returns the result as a JSON string.
 *
 * @param name - Tool name (`search_drive`, `list_folder`, `read_file`).
 * @param args - Parsed arguments from the model.
 * @returns JSON string with the tool result.
 */
export async function executeDriveTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {

  const workflow = _workflow;
  const contextBuilder = _contextBuilder;

  switch (name) {

    case "search_drive": {

      const query = typeof args.query === "string" ? args.query : "";

      const driveContext: DriveSearchContext = {
        operation: "search",
        query,
      };

      const result = await workflow.execute(driveContext);

      const driveCtx = result.driveContext ??
        contextBuilder.build(result.entries ?? []);

      return JSON.stringify({
        found: (result.entries?.length ?? 0) > 0,
        message: result.message,
        results: driveCtx,
      });

    }

    case "list_folder": {

      const folderId =
        typeof args.folder_id === "string" ? args.folder_id : "";

      const driveContext: DriveSearchContext = {
        operation: "list",
        folderId,
      };

      const result = await workflow.execute(driveContext);

      return JSON.stringify({
        message: result.message,
        items: result.entries?.map((e) => ({
          id: e.id,
          name: e.name,
          mimeType: e.mimeType,
          webViewLink: e.webViewLink,
        })) ?? [],
      });

    }

    case "read_file": {

      const fileId =
        typeof args.file_id === "string" ? args.file_id : "";
      const mimeType =
        typeof args.mime_type === "string" ? args.mime_type : undefined;

      const driveContext: DriveSearchContext = {
        operation: "read",
        fileId,
        mimeType,
      };

      const result = await workflow.execute(driveContext);

      return JSON.stringify({
        message: result.message,
        content: result.textContent ?? "",
      });

    }

    default:
      return JSON.stringify({
        error: `Unknown Drive tool: ${name}`,
      });

  }

}
