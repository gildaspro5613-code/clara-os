// ============================================
// CLARA OS
// Missions Module
//
// File : mission-from-brain.ts
// Responsibility :
// Transform a Brain execution into a Mission.
// ============================================

import type { BrainDashboard } from "@/lib/brain/dashboard";
import { resolveTaskExecution } from "@/lib/brain/task-execution";
import {
  DecisionPriority,
  TaskStatus,
} from "@/types";

import type {
  Mission,
  MissionPriority,
  MissionTask,
} from "./types/Mission";

function mapPriority(
  priority: DecisionPriority
): MissionPriority {
  switch (priority) {
    case DecisionPriority.CRITICAL:
      return "critical";

    case DecisionPriority.HIGH:
      return "high";

    case DecisionPriority.LOW:
      return "low";

    case DecisionPriority.MEDIUM:
    default:
      return "medium";
  }
}

function normalizeTaskTitle(title: string): string {
  return title.trim().toLocaleLowerCase();
}

type AdvertisedLiveCapability = {
  name: string;
  risk: "read" | "prepare" | "write" | "sensitive";
};

function advertisedLiveCapabilities(dashboard: BrainDashboard): AdvertisedLiveCapability[] {
  const metadata = dashboard.context.metadata;
  if (!Array.isArray(metadata?.liveCapabilities)) return [];
  return metadata.liveCapabilities.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { name?: unknown; risk?: unknown };
    if (typeof candidate.name !== "string" || !candidate.name.trim()) return [];
    const risk = candidate.risk;
    return [{
      name: candidate.name.trim(),
      risk: risk === "prepare" || risk === "write" || risk === "sensitive" ? risk : "read",
    }];
  });
}

function resolveLiveExecution(title: string, dashboard: BrainDashboard) {
  const capabilities = advertisedLiveCapabilities(dashboard);
  const normalized = normalizeTaskTitle(title);
  const patterns: Record<string, RegExp> = {
    run_project_computation: /\b(calcul|compute|dmx|canaux|univers|watt|puissance|capacit)/i,
    get_spatial_readiness: /\b(spatial|géométr|geometr|position|xyz|readiness|implantation)/i,
    build_preparation_from_project: /\b(prépar|prepar).*(projet|rider|fiche|document)/i,
    update_preparation_from_project: /\b(mettre à jour|actualiser|modifier).*(prépar|prepar)/i,
    create_spatial_object: /\b(créer|creer|ajouter).*(structure|projecteur|fixture)/i,
    update_spatial_fact: /\b(mettre à jour|positionner|orienter|modifier).*(spatial|position|orientation|xyz)/i,
    prepare_premium_execution: /\b(prépar|prepar).*(exécution|execution|console|show control)/i,
    export_preparation_pdf: /\b(export|pdf).*(prépar|dossier)|\b(prépar|dossier).*(export|pdf)/i,
  };
  const selected = capabilities.find((capability) => patterns[capability.name]?.test(normalized));
  if (!selected) return undefined;
  const scope = dashboard.context.event.context;
  if (!scope?.productId || !scope.workspaceId || !scope.userId || !scope.sessionId) return undefined;
  return {
    capabilityId: selected.name,
    context: { task: title },
    autonomous: selected.risk === "read" || selected.risk === "prepare",
    executionLocation: "external-product" as const,
    productId: scope.productId,
    workspaceId: scope.workspaceId,
    userId: scope.userId,
    sessionId: scope.sessionId,
    risk: selected.risk,
  };
}

function reconcileContinuationTasks(
  previousMission: Mission,
  plannedTasks: MissionTask[],
  decisionNextAction?: string,
): MissionTask[] {
  const completedByTitle = new Map(
    previousMission.tasks
      .filter((task) => task.completed)
      .map((task) => [normalizeTaskTitle(task.title), task]),
  );

  const previousCurrentTask = previousMission.tasks.find(
    (task) => !task.completed,
  );

  const nextActionChanged = Boolean(
    previousCurrentTask &&
    decisionNextAction?.trim() &&
    normalizeTaskTitle(previousCurrentTask.title) !==
      normalizeTaskTitle(decisionNextAction),
  );

  // If Clara's Brain has moved beyond the previous current step and that step
  // is no longer present in the new plan, preserve it as completed history.
  // This lets a user answer to a pending step and see the same mission advance
  // instead of creating a fresh mission or remaining stuck at 0%.
  if (
    previousCurrentTask &&
    nextActionChanged &&
    !plannedTasks.some(
      (task) =>
        normalizeTaskTitle(task.title) ===
        normalizeTaskTitle(previousCurrentTask.title),
    )
  ) {
    completedByTitle.set(
      normalizeTaskTitle(previousCurrentTask.title),
      {
        ...previousCurrentTask,
        completed: true,
      },
    );
  }

  const completedHistory = Array.from(completedByTitle.values());

  const reconciledPlan = plannedTasks.map((task) => {
    const completed = completedByTitle.get(
      normalizeTaskTitle(task.title),
    );

    return completed
      ? {
          ...task,
          id: completed.id,
          completed: true,
        }
      : task;
  });

  const completedTitles = new Set(
    reconciledPlan
      .filter((task) => task.completed)
      .map((task) => normalizeTaskTitle(task.title)),
  );

  return [
    ...completedHistory.filter(
      (task) => !completedTitles.has(normalizeTaskTitle(task.title)),
    ),
    ...reconciledPlan,
  ];
}

/**
 * Convert a Brain execution into an operational Mission.
 *
 * This function does not persist anything.
 * It only creates the Mission domain object.
 */
export function missionFromBrain(
  dashboard: BrainDashboard,
  previousMission?: Mission,
): Mission {
  const isContinuation =
    Boolean(
      previousMission &&
      dashboard.decision.missionId === previousMission.id,
    );

  const plannedTasks: MissionTask[] =
    dashboard.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      completed:
        task.status === TaskStatus.COMPLETED,
      execution: (() => {
        const execution =
          task.execution ??
          resolveTaskExecution(
            task.title,
            dashboard.decision,
            dashboard.sources,
          );

        if (execution) {
          return { ...execution, autonomous: true };
        }
        return resolveLiveExecution(task.title, dashboard);
      })(),
    }));

  const tasks: MissionTask[] =
    isContinuation && previousMission
      ? reconcileContinuationTasks(
          previousMission,
          plannedTasks,
          dashboard.decision.nextAction,
        )
      : plannedTasks;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const progress =
    tasks.length > 0
      ? Math.round(
          (completedTasks / tasks.length) * 100
        )
      : 0;

  const nextTask = tasks.find(
    (task) => !task.completed
  );

  const nextAction =
    dashboard.decision.nextAction?.trim() ||
    nextTask?.title;

  const completedTask = [...tasks]
    .reverse()
    .find((task) => task.completed);

  return {
    id:
      isContinuation && previousMission
        ? previousMission.id
        : dashboard.decision.missionId ??
          `mission-${dashboard.decision.id}`,

    title: dashboard.decision.objective.title,

    objective: dashboard.decision.objective.description,

    context:
      dashboard.recommendation.rationale ??
      dashboard.understanding.summary,

    status: progress === 100
      ? "completed"
      : "active",

    priority: mapPriority(
      dashboard.decision.priority
    ),

    createdAt:
      isContinuation && previousMission
        ? previousMission.createdAt
        : dashboard.decision.createdAt,

    tasks,

    progress,

    nextAction,

    lastAction: completedTask?.title,

    result:
      progress === 100
        ? dashboard.recommendation.summary
        : undefined,
  };
}
