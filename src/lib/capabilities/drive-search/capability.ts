/**
 * ============================================
 * CLARA OS
 * Drive Search Capability
 * --------------------------------------------
 * File : capability.ts
 * Responsibility :
 * Defines the Drive Search capability
 * registered in CapabilityRegistry.
 * ============================================
 */

import type { CapabilityToolParameter } from "@/lib/capabilities/capability-tool-adapter";

/**
 * Drive Search capability definition.
 */
export interface DriveSearchCapability {

  /**
   * Capability identifier.
   */
  readonly id: "search-drive";

  /**
   * Display name.
   */
  readonly name: string;

  /**
   * Description.
   */
  readonly description: string;

  /**
   * Model-facing input schema.
   */
  readonly inputSchema: Record<
    string,
    CapabilityToolParameter
  >;

}

/**
 * Registered Drive Search capability definition.
 */
export const DriveSearchCapabilityDefinition: DriveSearchCapability = {

  id: "search-drive",

  name: "Drive Search",

  description:
    "Searches, lists and reads Google Drive resources on behalf of the user.",

  inputSchema: {

    operation: {
      type: "string",
      description:
        "Drive operation to perform: search, list, or read.",
      required: true,
    },

    query: {
      type: "string",
      description:
        "Free-text file or folder name to search for.",
      required: false,
    },

    folderId: {
      type: "string",
      description:
        "Google Drive folder identifier used for listing contents.",
      required: false,
    },

    fileId: {
      type: "string",
      description:
        "Google Drive file identifier used for reading content.",
      required: false,
    },

    mimeType: {
      type: "string",
      description:
        "Optional MIME type hint when reading a file.",
      required: false,
    },

  },

};
