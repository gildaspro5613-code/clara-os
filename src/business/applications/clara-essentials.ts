/**
 * ============================================
 * CLARA OS
 * Clara Essentials
 * --------------------------------------------
 * File : clara-essentials.ts
 * Responsibility :
 * Defines the Clara Essentials
 * application manifest.
 * ============================================
 */

import { Application } from "../models/application";
import { WORKSPACE_TEMPLATE } from "../templates/workspace-template";

/**
 * Clara Essentials application.
 */
export const CLARA_ESSENTIALS: Application = {

  id: "clara-essentials",

  name: "Clara Essentials",

  description:
    "AI assistant for small and medium-sized businesses.",

  offer: {

    id: "essentials",

    name: "Clara Essentials",

    description: "Default commercial offer.",

    applications: [],

    active: true,

  },

  branding: {

    companyName: "Melodie Digital",

    primaryColor: "#2563EB",

    secondaryColor: "#0F172A",

    logo: "",

    slogan: "Votre collaboratrice IA.",

  },

  workspace: WORKSPACE_TEMPLATE,

  connectors: [

    "google-drive",

    "google-docs",

    "google-gmail",

    "google-calendar",

  ],

  capabilities: [

    "workspace-installation",

    "generate-document",

  ],

};