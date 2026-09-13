/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : clara.ts
 * Responsibility :
 * Main Clara runtime.
 * ============================================
 */

import { Event } from "@/types";
import { EventType } from "@/types/event";

import { Runtime } from "@/lib/runtime/runtime";
import { RuntimeFactory } from "@/lib/runtime/runtime-factory";

import { ClaraState } from "./state";
import {
  ClaraSession,
  createSession,
} from "./session";
import { orchestrate } from "./orchestrator";
import {
  executeMissionTask,
  completeMissionTask,
  canExecuteAutonomously,
} from "@/modules/missions";
import { dispatchEvent } from "./event-bus";
import { Journal } from "./journal";
import type { JournalEntry } from "./journal-entry";
import {
  loadSession,
  saveSession,
} from "./store/session-store";
import { loadMission } from "@/modules/missions/mission-store";
import { writeCognitiveEntry } from "./journal-writer";
import { saveMission } from "@/modules/missions/mission-store";
import {
  resolveActorContext,
  type ActorContext,
} from "./actor-context";

export class Clara {

  private session: ClaraSession = createSession();
  private runtime: Runtime | null = null;
  private readonly journal = new Journal();

  private async hydrateSession(
    actor?: ActorContext,
  ): Promise<void> {
    this.session = await loadSession(actor);

    if (this.session.mission) {
      const persistedMission = await loadMission(
        this.session.mission.id,
      );

      if (persistedMission) {
        const nextPendingTask = persistedMission.tasks.find(
          (task) => !task.completed,
        );

        if (
          persistedMission.status === "blocked" &&
          nextPendingTask &&
          !nextPendingTask.execution
        ) {
          persistedMission.status = "active";
          await saveMission(persistedMission);
        }

        this.session.mission = persistedMission;
      }
    }
  }

  public async start(): Promise<ClaraSession> {
    await this.hydrateSession();

    this.session.state = ClaraState.STARTING;
    this.session.updatedAt = new Date();
    await saveSession(this.session);

    this.runtime = RuntimeFactory.create();
    console.log("[CLARA] start: runtime created");

    this.session.state = ClaraState.WORKING;
    this.session.updatedAt = new Date();
    await saveSession(this.session);

    return this.session;
  }

  public async stop(): Promise<void> {
    await this.hydrateSession();

    this.session.state = ClaraState.STOPPING;
    this.session.updatedAt = new Date();
    await saveSession(this.session);

    if (this.runtime) {
      this.runtime.active = false;
    }

    this.session.state = ClaraState.STOPPED;
    this.session.updatedAt = new Date();
    await saveSession(this.session);
  }

  public async processEvent(
    event: Event,
  ): Promise<ClaraSession> {
    const eventActor = resolveActorContext(event.payload);
    const requestActor = eventActor.userId
      ? eventActor
      : undefined;

    await this.hydrateSession(requestActor);

    this.session = await orchestrate(
      this.session,
      event,
    );

    if (
      event.type === EventType.MISSION_RESUMED &&
      this.session.mission &&
      this.session.mission.status === "blocked"
    ) {
      const payload =
        typeof event.payload === "object" &&
        event.payload !== null
          ? event.payload as { missionId?: unknown }
          : undefined;

      if (
        typeof payload?.missionId === "string" &&
        payload.missionId === this.session.mission.id
      ) {
        this.session.mission = {
          ...this.session.mission,
          status: "active",
          result: undefined,
        };

        await saveMission(this.session.mission);
      }
    }

    const executionActor = requestActor ?? {
      userId: this.session.user.userId,
      organizationId: this.session.user.organizationId,
      workspaceId: this.session.user.workspaceId,
    };

    const MAX_AUTONOMOUS_TASKS_PER_EVENT = 10;
    let autonomousTasksExecuted = 0;

    while (
      this.session.mission &&
      autonomousTasksExecuted < MAX_AUTONOMOUS_TASKS_PER_EVENT
    ) {
      const nextPendingTask = this.session.mission.tasks.find(
        (task) => !task.completed,
      );

      if (!nextPendingTask) {
        break;
      }

      if (!nextPendingTask.execution) {
        if (this.session.mission.status !== "active") {
          this.session.mission = {
            ...this.session.mission,
            status: "active",
          };
          await saveMission(this.session.mission);
        }

        break;
      }

      if (!canExecuteAutonomously(nextPendingTask)) {
        this.session.mission = {
          ...this.session.mission,
          status: "blocked",
        };

        await saveMission(this.session.mission);
        break;
      }

      const missionBeforeExecution = this.session.mission;
      const result = await executeMissionTask(
        nextPendingTask,
        missionBeforeExecution,
        executionActor,
      );

      this.session.mission = completeMissionTask(
        missionBeforeExecution,
        nextPendingTask.id,
        result,
      );

      await saveMission(this.session.mission);
      autonomousTasksExecuted += 1;

      if (!result.success) {
        break;
      }

      if (this.session.mission.status === "completed") {
        break;
      }
    }

    if (this.session.state === ClaraState.STARTING) {
      this.session.state = ClaraState.WORKING;
    }

    this.session.updatedAt = new Date();
    await saveSession(this.session, requestActor);

    if (this.session.recommendation) {
      this.journal.addEntry(
        writeCognitiveEntry(
          this.session.recommendation,
        ),
      );
    }

    return this.session;
  }

  public getJournal(): readonly JournalEntry[] {
    return this.journal.getEntries();
  }

  public getState(): ClaraState {
    return this.session.state;
  }

  public getSession(): ClaraSession {
    return this.session;
  }
}