/**
 * ============================================
 * CLARA OS — I18N FOUNDATION
 * --------------------------------------------
 * File : types.ts
 * Responsibility : Central locale type definitions.
 * ============================================
 */

/**
 * Supported locales in Clara OS V1.
 * This is the single source of truth — do not redefine elsewhere.
 */
export type Locale = "fr" | "en" | "es" | "de" | "it";

/**
 * Namespace keys available in the message dictionaries.
 * Keeps message access type-safe across the codebase.
 */
export type MessageNamespace =
  | "common"
  | "navigation"
  | "cockpit"
  | "clara"
  | "onboarding"
  | "missions"
  | "runtime"
  | "errors"
  | "notifications";
