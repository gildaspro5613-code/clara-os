/**
 * ============================================
 * CLARA OS
 * Brevo Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Brevo connector module.
 * ============================================
 */

import { BrevoEngine } from "./brevo-engine";

/**
 * Brevo connector module.
 */
export const BREVO_MODULE = {

  id: "brevo",

  name: "Brevo",

  version: "1.0.0",

  description:
    "Provides access to Brevo (contacts, campaigns, transactional email) through Clara OS.",

  engine: new BrevoEngine(),

} as const;
