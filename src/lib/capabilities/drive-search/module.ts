/**
 * ============================================
 * CLARA OS
 * Drive Search Capability
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Drive Search capability module exports.
 * ============================================
 */

import { DriveSearchWorkflow } from "./workflow";
import { DriveSearchCapabilityDefinition } from "./capability";

/**
 * Drive Search capability module.
 */
export const DRIVE_SEARCH_MODULE = {

  id: "search-drive",

  name: "Drive Search",

  version: "1.0.0",

  description:
    "Searches, lists and reads Google Drive resources.",

  definition: DriveSearchCapabilityDefinition,

  workflow: new DriveSearchWorkflow(),

} as const;
