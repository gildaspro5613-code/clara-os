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
import type { Mission } from "@/modules/missions/types/Mission";
import { ClaraState } from "./state";

export interface ClaraUserIdentity {
  /** Stable application-defined user identifier used for user-scoped access. */
  userId: string;
  firstName: string | null;
  organizationId?: string;
  workspaceId?: string;
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
    // Transitional single-owner identity. Authenticated account identity can
    // replace this value later without changing connector/provider contracts.
    userId: process.env.CLARA_USER_ID?.trim() || "owner",
    firstName: configuredFirstName || "Gildas",
    organizationId: process.env.CLARA_ORGANIZATION_ID?.trim() || undefined,
    workspaceId: process.env.CLARA_WORKSPACE_ID?.trim() || "default",
  };
}

export interface ClaraSession {
  /**
   * Current operational state.
   */
  state: ClaraState;

  /**
   * Current recommendation produced
   * by Clara's Brain.
   */
  recommendation: Recommendation | null;

  /**
   * Current operational mission produced
   * by Clara's Brain.
   */
  mission: Mission | null;

  /**
   * External information sources available during the current cycle.
   */
  sources: BrainSourceContext[];

  /**
   * User identity available to Clara's conversational and operational surfaces.
   */
  user: ClaraUserIdentity;

  /**
   * Shared persisted Clara conversation used by every chat surface.
   */
  conversation: ClaraConversationMessage[];

  /**
   * Session creation date.
   */
  startedAt: Date;

  /**
   * Last update.
   */
  updatedAt: Date;
}

/**
 * Creates a new Clara session.
 */
export function createSession(): ClaraSession {
  const now = new Date();

  return {
    state: ClaraState.STARTING,
    recommendation: null,
    mission: null,
    sources: [],
    user: resolveDefaultUser(),
    conversation: [],
    startedAt: now,
    updatedAt: now,
  };
}

/**
 * Supplies V1 defaults when loading sessions created before conversation and
 * identity became first-class Clara session state.
 */
export function normalizeSession(
  session: ClaraSession,
): ClaraSession {
  const defaults = createSession();
  const existingUser = session.user ?? defaults.user;

  return {
    ...session,
    user: {
      ...defaults.user,
      ...existingUser,
      userId: existingUser.userId?.trim() || defaults.user.userId,
    },
    conversation: Array.isArray(session.conversation)
      ? session.conversation
      : [],
  };
}
