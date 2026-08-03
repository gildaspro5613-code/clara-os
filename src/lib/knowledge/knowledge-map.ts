/**
 * ============================================
 * CLARA OS
 * Knowledge Module
 * --------------------------------------------
 * File : knowledge-map.ts
 * Responsibility :
 * Defines the global organization of
 * Clara's knowledge ecosystem.
 * ============================================
 */

/**
 * Global Knowledge Map.
 */
export const KNOWLEDGE_MAP = {

  corporate: [

    "identity",
    "vision",
    "values",
    "strategy",

  ],

  business: [

    "products",
    "services",
    "pricing",
    "sales",
    "customer-journey",

  ],

  ecosystem: [

    "partners",
    "connectors",
    "technologies",
    "integrators",
    "consultants",

  ],

  industries: [

    "festival",
    "theatre",
    "congress",
    "training",
    "healthcare",
    "real-estate",

  ],

  operations: [

    "processes",
    "documentation",
    "best-practices",
    "faq",

  ],

  experience: [

    "history",
    "feedback",
    "incidents",
    "lessons-learned",

  ],

} as const;