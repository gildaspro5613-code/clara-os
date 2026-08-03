/**
 * ============================================
 * CLARA OS
 * Publisher Module
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Publisher module.
 * ============================================
 */

import { PublisherEngine } from "./publisher-engine";

/**
 * Publisher module.
 */
export const PUBLISHER_MODULE = {

  id: "publisher",

  name: "Publisher",

  version: "1.0.0",

  description:
    "Transforms Clara's knowledge into professional publications.",

  engine: new PublisherEngine(),

} as const;