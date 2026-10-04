// ============================================
// CLARA OS
// Core Module
//
// File : session.ts
// Responsibility :
// Represents Clara's current working session.
// ============================================

import type { Recommendation } from "@/types";
import type { BrainSourceContext } from "@/lib/brain/brain-source";
import type { BrainDashboard } from "@/lib/brain/dashboard";
import type { Mission } from "@/modules/missions/types/Mission";
import { ClaraState } from "./state";

export interface ClaraUserIdentity {
  firstName: string | null;
}

export interface ClaraConversationMessage {
  id: string;
  role: "user" | "clara";
  content: string;
  createdAt: string;
}

function resolveDefaultUser(): ClaraUserIdentity {
  const configuredFirstName =
    process.env.CLARA_USER_FIRST_NAME?.trim() ||
    process.env.CLARA_OWNER_FIRST_NAME?.trim();

  return {
    // Transitional V1 fallback for the current single-owner Melodie Digital
    // workspace. Authenticated workspace identity will replace this fallback.
    firstName: configuredFirstName || "Gildas",
  };
}

export interface ClaraSession {
  state: ClaraState;
  recommendation: Recommendation | null;
  /** Latest complete dashboard produced by a real Brain execution cycle. */
  brainDashboard: BrainDashboard | null;
  mission: Mission | null;
  sources: BrainSourceContext[];
  user: ClaraUserIdentity;
  conversation: ClaraConversationMessage[];
  startedAt: Date;
  updatedAt: Date;
}

export function createSession(): ClaraSession {
  const now = new Date();

  return {
    state: ClaraState.STARTING,
    recommendation: null,
    brainDashboard: null,
    mission: null,
    sources: [],
    user: resolveDefaultUser(),
    conversation: [],
    startedAt: now,
    updatedAt: now,
  };
}

/**
 * Supplies V1 defaults when loading sessions created before conversation,
 * identity and the latest Brain dashboard became first-class session state.
 */
export function normalizeSession(
  session: ClaraSession,
): ClaraSession {
  const defaults = createSession();

  return {
    ...session,
    brainDashboard: session.brainDashboard ?? null,
    user: session.user ?? defaults.user,
    conversation: Array.isArray(session.conversation)
      ? session.conversation
      : [],
  };
}
