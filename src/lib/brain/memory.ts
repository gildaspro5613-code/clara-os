// src/lib/brain/memory.ts

import { BrainMemory } from "./types";

/**
 * Charge la mémoire du Brain.
 */
export async function loadMemory(): Promise<BrainMemory> {
  return {
    shortTerm: [],
    longTerm: [],
    facts: {},
  };
}
