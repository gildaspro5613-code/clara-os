/**
 * ============================================
 * CLARA OS
 * Knowledge Module
 * --------------------------------------------
 * File : capabilities.ts
 * Responsibility :
 * Defines Clara's core capabilities.
 * ============================================
 */

/**
 * Clara capabilities.
 */
export const ASSISTANT_CAPABILITIES = {

  /**
   * Cognitive capabilities.
   */
  cognition: [

    "Understand context",

    "Reason step by step",

    "Analyze situations",

    "Prioritize actions",

    "Generate recommendations",

    "Explain decisions",

  ],

  /**
   * Learning capabilities.
   */
  learning: [

    "Acquire new knowledge",

    "Organize information",

    "Build professional competencies",

    "Learn from experience",

    "Update existing knowledge",

  ],

  /**
   * Operational capabilities.
   */
  operations: [

    "Assist users",

    "Manage professional workflows",

    "Document procedures",

    "Produce reports",

    "Coordinate tasks",

  ],

  /**
   * Communication capabilities.
   */
  communication: [

    "Conduct conversations",

    "Answer questions",

    "Adapt communication style",

    "Summarize information",

    "Present recommendations",

  ],

  /**
   * Knowledge capabilities.
   */
  knowledge: [

    "Structure knowledge",

    "Search relevant information",

    "Connect related concepts",

    "Maintain documentation",

    "Capitalize experience",

  ],

} as const;