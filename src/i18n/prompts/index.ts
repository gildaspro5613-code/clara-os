/**
 * ============================================
 * CLARA OS — I18N PROMPTS
 * --------------------------------------------
 * File : index.ts
 * Responsibility :
 * Builds the full Clara system prompt for the active locale.
 *
 * Architecture:
 *   INVARIANT  (identity, rules, safety, autonomy)
 *       +
 *   LOCALISED  (language, tone, formulations)
 *       ↓
 *   CLARA SYSTEM PROMPT
 *
 * The invariant block is never duplicated.
 * Only the localised instructions change per locale.
 * ============================================
 */

import { readFileSync } from "fs";
import { join } from "path";

import type { Locale } from "@/i18n/types";

const PROMPTS_DIR = join(process.cwd(), "src", "i18n", "prompts");

/**
 * Reads a prompt file from the prompts directory.
 * Falls back silently to an empty string if the file is missing.
 */
function readPromptFile(filename: string): string {
  try {
    return readFileSync(join(PROMPTS_DIR, filename), "utf-8");
  } catch {
    return "";
  }
}

/**
 * Returns the full Clara system prompt for the given locale.
 *
 * The prompt is composed of:
 * 1. The invariant block (identity, rules, safety) — shared across all locales.
 * 2. The localised block (language directive, tone, formulations) — per locale.
 *
 * Falls back to French if the locale file is unavailable.
 *
 * @param locale - The active locale resolved by Clara OS.
 * @returns The assembled system prompt string.
 */
export function getClaraSystemPrompt(locale: Locale): string {
  const invariant = readPromptFile("clara-invariant.md");
  const localised = readPromptFile(`clara.${locale}.md`) || readPromptFile("clara.fr.md");

  return [invariant, localised].filter(Boolean).join("\n\n---\n\n");
}
