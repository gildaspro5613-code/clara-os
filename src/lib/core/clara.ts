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
import { saveSession } from "./store/session-store";
import { writeCognitiveEntry } from "./journal-writer";

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
   * Starts Clara.
   */
  public async start(): Promise<ClaraSession> {

    this.session = createSession();

    this.session.state = ClaraState.STARTING;
    this.session.updatedAt = new Date();
    saveSession(this.session);

    this.runtime = RuntimeFactory.create();
    console.log("[CLARA] start: runtime created");

    this.session.state = ClaraState.WORKING;
    this.session.updatedAt = new Date();
    saveSession(this.session);

    return this.session;

  }

  /**
   * Stops Clara.
   */
  public async stop(): Promise<void> {

    this.session.state = ClaraState.STOPPING;
    this.session.updatedAt = new Date();
    saveSession(this.session);

    if (this.runtime) {
      this.runtime.active = false;
    }

    this.session.state = ClaraState.STOPPED;
    this.session.updatedAt = new Date();
    saveSession(this.session);

  }

  /**
   * Processes one incoming event.
   */
  public async processEvent(
    event: Event,
  ): Promise<ClaraSession> {

    this.session = await orchestrate(
      this.session,
      event,
    );

    const nextExecutableTask =
      this.session.mission?.tasks.find(
        (task) => canExecuteAutonomously(task),
      );

    if (this.session.mission && nextExecutableTask) {
      const result =
        await executeMissionTask(
          nextExecutableTask,
          this.session.mission,
        );

      this.session.mission =
        completeMissionTask(
          this.session.mission,
          nextExecutableTask.id,
          result,
        );

      await dispatchEvent({
        id: crypto.randomUUID(),
        type: EventType.TASK_COMPLETED,
        source: "mission",
        timestamp: new Date(),
        payload: {
          taskId: nextExecutableTask.id,
          taskTitle: nextExecutableTask.title,
          mission: {
            id: this.session.mission.id,
            title: this.session.mission.title,
            objective: this.session.mission.objective,
            context: this.session.mission.context,
          },
          result,
        },
      });
    }

    if (this.session.state === ClaraState.STARTING) {
      this.session.state = ClaraState.WORKING;
    }

    this.session.updatedAt = new Date();
    saveSession(this.session);

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