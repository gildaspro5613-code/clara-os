import {nativeContext} from '@/lib/native/scoped-context';
import {RegistryError} from '@/lib/canonical/registry';
/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : orchestrator.ts
 * Responsibility :
 * Coordinates one complete execution cycle
 * between the Core and the Brain.
 * ============================================
 */

import { Event } from "@/types";

import { runBrainDashboard } from "@/lib/brain";
import { missionFromBrain } from "@/modules/missions";
import { saveMission } from "@/modules/missions/mission-store";
import { acquisitionLocale } from "@/lib/brain/acquisition-event";
import { saveAcquisitionRecord } from "@/lib/acquisition/acquisition-store";

import { withPersistedConversation } from "./conversation-context";
import { ClaraSession } from "./session";

/** Unknown/informational chat is non-mutating. Only an explicit command may
 * re-plan a mission; model-generated intent is never user authorization. */
export function missionMutationRequested(event: Event): boolean {
  if (event.type !== "USER_MESSAGE") return true;
  const payload = event.payload as { message?: unknown } | null;
  if (typeof payload?.message !== "string") return false;
  const text = payload.message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  if (/^(?:ne |n'|do not |don't |no |nicht |non )/.test(text)) return false;
  const command = /^(?:(?:s'il te plait|svp|please|clara)[, :]+)?(?:(?:peux-tu|pourrais-tu|veux-tu|can you|could you)\s+)?(?:creer?|cree[rz]?|prepare[rz]?|planifie[rz]?|organise[rz]?|redige[rz]?|modifie[rz]?|mets? a jour|reprends?|reprendre|poursuis?|continue[rz]?|termine[rz]?|cloture[rz]?|annule[rz]?|create|prepare|plan|update|resume|continue|complete|cancel|crea|prepara|modifica|actualiza|erstelle|plane|aktualisiere)\b/;
  return command.test(text);
}

/** Executes one complete Clara reasoning cycle. */
export async function orchestrate(
  session: ClaraSession,
  event: Event,
): Promise<ClaraSession> {
  const mutateMission = missionMutationRequested(event);
  const native = nativeContext();
  if (!mutateMission && !session.mission && native && native.consultationProtocolVersion !== 1)
    throw new RegistryError(503, 'NATIVE_CONSULTATION_MIGRATION_REQUIRED');
  const activeMission =
    session.mission &&
    session.mission.status !== "completed" &&
    session.mission.status !== "cancelled"
      ? session.mission
      : undefined;

  const dashboard = await runBrainDashboard(
    withPersistedConversation(session,event),
    activeMission,
    acquisitionLocale(event),
  );
  const recommendation = dashboard.recommendation;
  const mission = mutateMission ? missionFromBrain(dashboard, activeMission) : session.mission;

  // Keep the exact dashboard produced by this real cycle so every surface
  // observes Clara's latest understanding instead of re-running a preview event.
  session.brainDashboard = dashboard;
  session.recommendation = recommendation;
  session.mission = mission;

  if (mutateMission && mission) await saveMission(mission);

  if (
    dashboard.acquisition &&
    dashboard.acquisitionDecisionBrief &&
    dashboard.acquisitionLifecycle
  ) {
    const workspaceId = event.context?.workspaceId?.trim();
    if (!workspaceId) {
      throw new Error("Acquisition events require a trusted workspace context.");
    }

    await saveAcquisitionRecord({
      workspaceId,
      qualification: dashboard.acquisition,
      decisionBrief: dashboard.acquisitionDecisionBrief,
      lifecycle: dashboard.acquisitionLifecycle,
      preserveLifecycle: true,
    });
  }

  session.sources = dashboard.sources;
  session.updatedAt = new Date();

  return session;
}
