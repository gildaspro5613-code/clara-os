/**
 * ============================================
 * CLARA OS
 * Google Drive Integration
 * --------------------------------------------
 * File : drive.ts
 * Responsibility :
 * Provides access to the
 * Google Drive API.
 * ============================================
 */

import { google } from "googleapis";

import { GoogleIntegration } from "./auth";
import {
  listFiles,
} from "@/lib/connectors/google/drive";
import { GoogleDriveFolder } from "./models/google-drive-folder";

/**
 * Google Drive integration.
 */
export class GoogleDriveIntegration {

  /**
   * Google Drive API.
   */
  private readonly drive;

  /**
   * Constructor.
   */
  constructor() {

    const auth = GoogleIntegration.createClient();

    this.drive = google.drive({

      version: "v3",

      auth,

    });

  }

  /**
   * Lists Google Drive files.
   */
  public async listFiles(
    query?: string,
  ) {

    return listFiles({

      query,

    });

  }

  /**
   * Creates a folder.
   */
  public async createFolder(
    name: string,
    parentId?: string,
  ): Promise<string> {

    const response =
      await this.drive.files.create({

        requestBody: {

          name,

          mimeType: "application/vnd.google-apps.folder",

          parents: parentId
            ? [parentId]
            : undefined,

        },

        fields: "id",

      });

    return response.data.id ?? "";

  }

  /**
   * Finds a folder.
   */
  public async findFolder(
    name: string,
    parentId?: string,
  ): Promise<GoogleDriveFolder | null> {

    const query = [

      `name='${name}'`,

      "mimeType='application/vnd.google-apps.folder'",

      "trashed=false",

      parentId
        ? `'${parentId}' in parents`
        : undefined,

    ]
      .filter(Boolean)
      .join(" and ");

    const response =
      await this.drive.files.list({

        q: query,

        fields: "files(id,name,parents)",

        pageSize: 1,

      });

    const folder = response.data.files?.[0];

    if (!folder) {

      return null;

    }

    return {

      id: folder.id ?? "",

      name: folder.name ?? "",

      parentId: folder.parents?.[0],

    };

  }

  /**
   * Lists folders.
   */
  public async listFolders(
    parentId?: string,
  ): Promise<GoogleDriveFolder[]> {

    const query = [

      "mimeType='application/vnd.google-apps.folder'",

      "trashed=false",

      parentId
        ? `'${parentId}' in parents`
        : undefined,

    ]
      .filter(Boolean)
      .join(" and ");

    const response =
      await this.drive.files.list({

        q: query,

        fields: "files(id,name,parents)",

      });

    return (response.data.files ?? []).map(folder => ({

      id: folder.id ?? "",

      name: folder.name ?? "",

      parentId: folder.parents?.[0],

    }));

  }

}