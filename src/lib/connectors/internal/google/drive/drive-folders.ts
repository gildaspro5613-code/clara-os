/**
 * ============================================
 * CLARA OS
 * Google Drive Folders
 * --------------------------------------------
 * File : drive-folders.ts
 * Responsibility :
 * Manages Google Drive folder
 * lookup and creation.
 * ============================================
 */

import type { drive_v3 } from "googleapis";

/**
 * Google Drive folder reference.
 */
export interface DriveFolder {

  /**
   * Folder identifier.
   */
  id: string;

  /**
   * Folder name.
   */
  name: string;

  /**
   * Parent folder identifier.
   */
  parentId?: string;

}

/**
 * Google Drive folders service.
 */
export class DriveFolders {

  /**
   * Creates a folder service.
   */
  constructor(
    private readonly drive: drive_v3.Drive,
  ) {}

  /**
   * Ensures a folder exists.
   */
  public async ensure(
    name: string,
    parentId?: string,
  ): Promise<DriveFolder> {

    const existingFolder =
      await this.findByName(
        name,
        parentId,
      );

    if (existingFolder) {

      return existingFolder;

    }

    return this.create(
      name,
      parentId,
    );

  }

  /**
   * Finds a folder by name.
   */
  public async findByName(
    name: string,
    parentId?: string,
  ): Promise<DriveFolder | null> {

    const response =
      await this.drive.files.list({

        q: this.buildQuery(
          name,
          parentId,
        ),

        fields:
          "files(id,name,parents)",

        pageSize: 1,

        includeItemsFromAllDrives: true,

        supportsAllDrives: true,

      });

    const folder =
      response.data.files?.[0];

    if (!folder?.id || !folder.name) {

      return null;

    }

    return {

      id: folder.id,

      name: folder.name,

      parentId:
        folder.parents?.[0],

    };

  }

  /**
   * Creates a folder.
   */
  public async create(
    name: string,
    parentId?: string,
  ): Promise<DriveFolder> {

    const response =
      await this.drive.files.create({

        requestBody: {

          name,

          mimeType:
            "application/vnd.google-apps.folder",

          parents: parentId
            ? [parentId]
            : undefined,

        },

        fields: "id,name,parents",

        supportsAllDrives: true,

      });

    const folder = response.data;

    if (!folder.id || !folder.name) {

      throw new Error(
        "Google Drive did not return the created folder.",
      );

    }

    return {

      id: folder.id,

      name: folder.name,

      parentId:
        folder.parents?.[0],

    };

  }

  /**
   * Builds the Drive folder query.
   */
  private buildQuery(
    name: string,
    parentId?: string,
  ): string {

    const escapedName =
      name.replaceAll(
        "'",
        "\\'",
      );

    return [

      `name='${escapedName}'`,

      "mimeType='application/vnd.google-apps.folder'",

      "trashed=false",

      parentId
        ? `'${parentId}' in parents`
        : undefined,

    ]
      .filter(Boolean)
      .join(" and ");

  }

}
