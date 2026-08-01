/**
 * ============================================
 * CLARA OS
 * Knowledge Engine
 * --------------------------------------------
 * File : index.ts
 * Responsibility :
 * Public exports for the Knowledge Engine.
 * ============================================
 */

import { KnowledgeEngine } from "./engine";

/**
 * Shared Knowledge Engine.
 */
const knowledge = new KnowledgeEngine();

/**
 * Returns the shared Knowledge Engine.
 */
export function getKnowledge(): KnowledgeEngine {
  return knowledge;
}

export * from "./engine";
export * from "./types";
export * from "./module";