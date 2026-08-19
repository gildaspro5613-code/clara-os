/**
 * ============================================
 * CLARA OS
 * Organize Drive Capability
 * --------------------------------------------
 * Responsibility :
 * Organizes an existing Google Drive file
 * into a target folder.
 * ============================================
 */

export const ORGANIZE_DRIVE_CAPABILITY = "organize-drive";

export interface OrganizeDriveCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
}

export const OrganizeDriveCapabilityDefinition: OrganizeDriveCapability = {
  id: ORGANIZE_DRIVE_CAPABILITY,
  name: "Organize Drive",
  description:
    "Moves an existing Google Drive file into the appropriate folder, creating the folder when necessary.",
  version: "1.0.0",
  category: "Workspace",
};
