/**
 * ============================================
 * CLARA OS
 * Workspace Reconciliation
 * --------------------------------------------
 * Recovers existing Google Workspace resources
 * without creating new resources.
 * ============================================
 */

import { GoogleWorkspace } from "@/lib/integrations/google/workspace";

import { ESSENTIALS_WORKSPACE_TEMPLATE } from "@/business/templates/workspace/essentials-workspace-template";

import { loadWorkspace, saveWorkspace } from "./workspace-store";

import type { WorkspaceDocument } from "@/onboarding/models/workspace-document";
import type { WorkspaceFolder } from "@/onboarding/models/workspace-folder";

/**
 * Recovers existing workspace folders from Google Drive.
 *
 * This operation is read-only against Google Drive.
 */
export async function reconcileWorkspaceFolders(): Promise<WorkspaceFolder[]> {

  const workspace =
    await loadWorkspace();

  if (!workspace) {

    throw new Error(
      "Workspace introuvable.",
    );

  }

  if (!workspace.companyFolderId?.trim()) {

    throw new Error(
      "Workspace companyFolderId is missing.",
    );

  }

  const drive =
    GoogleWorkspace.drive();

  const existingFolders =
    await drive.listFolders(
      workspace.companyFolderId,
    );

  const folders: WorkspaceFolder[] = [];

  for (
    const folderName
    of ESSENTIALS_WORKSPACE_TEMPLATE.folders
  ) {

    const folder =
      existingFolders.find(
        (candidate) =>
          candidate.name === folderName,
      );

    if (!folder?.id) {

      throw new Error(
        `Workspace folder "${folderName}" not found.`,
      );

    }

    folders.push({

      name: folder.name,

      folderId: folder.id,

    });

  }

  await saveWorkspace({

    ...workspace,

    folders,

  });

  return folders;

}


/**
 * Recovers existing Google Documents from Drive.
 *
 * This operation is read-only against Google Drive.
 */
export async function reconcileWorkspaceDocuments(): Promise<WorkspaceDocument[]> {

  const workspace =
    await loadWorkspace();

  if (!workspace) {

    throw new Error(
      "Workspace introuvable.",
    );

  }

  const drive =
    GoogleWorkspace.drive();

  const documents = [

    `${workspace.companyName} - Présentation`,
    `${workspace.companyName} - Contrat`,
    `${workspace.companyName} - Devis`,
    `${workspace.companyName} - Compte-rendu`,

  ];

  const createdDocuments: WorkspaceDocument[] = [];

  for (const name of documents) {

    const result =
      await drive.listFiles(
        `name='${name.replace("'", "\\'")}' and trashed=false`,
      );

    const file =
      result.files.find(
        (candidate) =>
          candidate.name === name &&
          candidate.mimeType ===
            "application/vnd.google-apps.document",
      );

    if (!file?.id) {

      throw new Error(
        `Google Document "${name}" not found.`,
      );

    }

    createdDocuments.push({

      name,

      documentId:
        file.id,

      documentUrl:
        file.webViewLink ??
        `https://docs.google.com/document/d/${file.id}/edit`,

    });

  }

  await saveWorkspace({

    ...workspace,

    documents:
      createdDocuments,

  });

  return createdDocuments;

}


/**
 * Recovers the existing Google Calendar from the
 * authenticated account without creating a new one.
 */
export async function reconcileWorkspaceCalendar(): Promise<{
  name: string;
  calendarId: string;
}> {

  const workspace =
    await loadWorkspace();

  if (!workspace) {

    throw new Error(
      "Workspace introuvable.",
    );

  }

  const calendar =
    GoogleWorkspace.calendar();

  const result =
    await calendar.listCalendars();

  const expectedName =
    `${workspace.companyName} Calendar`;

  const existingCalendar =
    result.calendars.find(
      (candidate) =>
        candidate.summary === expectedName &&
        typeof candidate.id === "string",
    );

  if (!existingCalendar?.id) {

    throw new Error(
      `Google Calendar "${expectedName}" not found.`,
    );

  }

  const workspaceCalendar = {

    name:
      expectedName,

    calendarId:
      existingCalendar.id,

  };

  await saveWorkspace({

    ...workspace,

    calendar:
      workspaceCalendar,

  });

  return workspaceCalendar;

}
