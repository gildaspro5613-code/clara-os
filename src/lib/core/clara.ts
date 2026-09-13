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

export class Clara {

  /**
   * Current runtime session.
   */
  private session: ClaraSession = createSession();

  /**
   * Active Clara Runtime.
   */
  private runtime: Runtime | null = null;

  /**
   * Clara's operational journal.
   */
  private readonly journal = new Journal();

  /**
   * Reload the durable session before a cognitive cycle.
   *
   * Serverless requests are not guaranteed to reuse the same module instance.
   * Treat the database as the source of truth so mission/conversation continuity
   * does not depend on a warm Vercel runtime.
   */
  private async hydrateSession(): Promise<void> {
    this.session = await loadSession();

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

  /**
   * Starts Clara.
   */
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

  /**
   * Stops Clara.
   */
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

  /**
   * Processes one incoming event.
   */
  public async processEvent(
    event: Event,
  ): Promise<ClaraSession> {

    await this.hydrateSession();

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

      const execution = await executeMissionTask(
        nextPendingTask,
        this.session.mission,
      );

      autonomousTasksExecuted += 1;

      if (execution.gate.outcome !== "ALLOW") {
        this.session.mission = {
          ...this.session.mission,
          status: "blocked",
          result: execution.gate.reason,
        };
        await saveMission(this.session.mission);
        break;
      }

      if (!execution.runtimeResult) {
        break;
      }

      if (!execution.runtimeResult.success) {
        this.session.mission = {
          ...this.session.mission,
          status: "blocked",
          result: execution.runtimeResult.message,
        };
        await saveMission(this.session.mission);
        break;
      }

      if (execution.verification?.status !== "VERIFIED") {
        this.session.mission = {
          ...this.session.mission,
          result:
            execution.verification?.message ??
            "Execution completed but could not be verified.",
        };
        await saveMission(this.session.mission);
        break;
      }

      if (execution.mission) {
        this.session.mission = execution.mission;
      } else {
        const refreshedMission = await loadMission(this.session.mission.id);
        if (refreshedMission) {
          this.session.mission = refreshedMission;
        }
      }

      if (
        !this.session.mission ||
        this.session.mission.status === "completed"
      ) {
        break;
      }
    }

    if (this.session.state === ClaraState.STARTING) {
      this.session.state = ClaraState.WORKING;
    }

    this.session.updatedAt = new Date();
    await saveSession(this.session);

    if (this.session.recommendation) {
      this.journal.addEntry(
        writeCognitiveEntry(
          this.session.recommendation,
        ),
      );
    }

    return this.session;

  }

  /**
   * Returns Clara's operational journal.
   */
  public getJournal(): readonly JournalEntry[] {
    return this.journal.getEntries();
  }

  /**
   * Returns current state.
   */
  public getState(): ClaraState {
    return this.session.state;
  }

  /**
   * Returns current session.
   */
  public getSession(): ClaraSession {
    return this.session;
  }

}
