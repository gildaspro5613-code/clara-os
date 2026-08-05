/**
 * ============================================
 * CLARA OS
 * Google Drive – Share File
 * --------------------------------------------
 * File : share-file.ts
 * Responsibility :
 * Creates a Google Drive permission
 * for a file via DriveClient.
 * ============================================
 */

import type { drive_v3 } from "googleapis";

import { DriveClient } from "./drive-client";

/**
 * Shares a Google Drive file with a specific user.
 *
 * Uses {@link DriveClient} to obtain an authenticated Drive client and
 * delegates permission creation to the Drive API v3 `permissions.create`
 * endpoint. Errors thrown by the Google API are propagated to the caller
 * unchanged.
 *
 * @param fileId - The unique identifier of the Drive file to share.
 * @param emailAddress - The email address of the user receiving access.
 * @param role - The access level to grant to the user.
 * @returns The created Google Drive permission.
 */
export async function shareFile(
  fileId: string,
  emailAddress: string,
  role: "reader" | "commenter" | "writer",
): Promise<drive_v3.Schema$Permission> {

  const drive = new DriveClient().create();

  const response = await drive.permissions.create({

    fileId,

    requestBody: {

      type: "user",
      emailAddress,
      role,

    },

    fields: "id,type,role,emailAddress,domain,allowFileDiscovery,displayName,photoLink,expirationTime,pendingOwner,deleted,permissionDetails,teamDrivePermissionDetails,view,inheritedPermissionsDisabled",

    supportsAllDrives: true,

    sendNotificationEmail: false,

  });

  return response.data;

}
