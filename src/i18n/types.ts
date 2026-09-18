/**
 * ============================================
 * CLARA OS — I18N FOUNDATION
 * --------------------------------------------
 * File : types.ts
 * Responsibility : Central locale and message namespace definitions.
 * ============================================
 */

export type Locale = "fr" | "en" | "es" | "de" | "it";

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
  | "automationsMake"
  | "missionsPage";
