/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : planners.ts
 * Responsibility :
 * Build an execution plan from a decision.
 * ============================================
 */

import {
  Decision,
  Task,
  TaskStatus,
} from "@/types";
import {
  proposePhysicalAction,
  type PhysicalActionProposal,
} from "@/lib/connectors/clara-live/physical-action";

export interface PhysicalActionDraft {
  agentId: string;
  connector: string;
  capability: string;
  parameters: Record<string, unknown>;
  sessionId: string;
}

export interface ExecutionPlan {
  tasks: Task[];
  physicalActions: PhysicalActionProposal[];
}

/**
 * Create the execution plan associated with a decision.
 *
 * Physical actions may only enter the plan as PROPOSED. The Brain has no
 * function here that can authorize or execute them.
 */
export function plan(
  decision: Decision,
  physicalAction?: PhysicalActionDraft,
): Task[] {
  return buildExecutionPlan(decision, physicalAction).tasks;
}

export function buildExecutionPlan(
  decision: Decision,
  physicalAction?: PhysicalActionDraft,
): ExecutionPlan {
  const task: Task = {
    id: crypto.randomUUID(),
    decision,
    title: decision.summary,
    description: `Execute decision: ${decision.summary}`,
    status: TaskStatus.TODO,
    createdAt: new Date(),
  };

  return {
    tasks: [task],
    physicalActions: physicalAction
      ? [proposePhysicalAction({ taskId: task.id, ...physicalAction })]
      : [],
  };
}
