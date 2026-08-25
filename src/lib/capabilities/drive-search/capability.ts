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

}

/**
 * Registered Drive Search capability definition.
 */
export const DriveSearchCapabilityDefinition: DriveSearchCapability = {

  id: "search-drive",

  name: "Drive Search",

  description:
    "Searches, lists and reads Google Drive resources on behalf of the user.",

};
