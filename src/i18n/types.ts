/**
 * ============================================
 * CLARA OS — I18N FOUNDATION
 * --------------------------------------------
 * File : types.ts
 * Responsibility : Central locale and message namespace definitions.
 * ============================================
 */

/**
 * Supported locales in Clara OS V1.
 * This is the single source of truth — do not redefine elsewhere.
 */
export type Locale = "fr" | "en" | "es" | "de" | "it";

/**
 * Namespaces available through next-intl.
 * Keep this union aligned with the dictionaries loaded by request.ts.
 */
export type MessageNamespace =
  | "common"
  | "navigation"
  | "cockpit"
  | "cockpitUi"
  | "clara"
  | "chat"
  | "voice"
  | "onboarding"
  | "missions"
  | "runtime"
  | "errors"
  | "notifications"
  | "contacts"
  | "automations"
  | "pages"
  | "documents"
  | "telephony"
  | "brainPage"
  | "agendaPage"
  | "journalPage"
  | "automationsBrevo"
  | "missionsPage";
