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
import type { ExecutionIntent } from "@/lib/runtime/execution-intent";
import type { ExecutionCoordinatorResult } from "@/lib/runtime/execution-coordinator";

import { ClaraState } from "./state";
import {
  ClaraSession,
  createSession,
} from "./session";
import { createSystemEvent } from "./events";
import { orchestrate } from "./orchestrator";
import { Journal } from "./journal";
import { JournalEntryType } from "./journal-entry";
import { writeCognitiveEntry } from "./journal-writer";
import { writeOperationalEntry } from "./operational-journal-writer";

export class Clara {

  /**
   * Current runtime session.
   */
  private session: ClaraSession = createSession();

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

    await this.processEvent(
      createSystemEvent(),
    );

    this.session.state = ClaraState.WORKING;
    this.session.updatedAt = new Date();

    return this.session;

  }

  /**
   * Stops Clara.
   */
  public async stop(): Promise<void> {

    this.session.state = ClaraState.STOPPING;
    this.session.updatedAt = new Date();

    this.session.state = ClaraState.STOPPED;
    this.session.updatedAt = new Date();

  }

  /**
   * Processes one incoming event.
   */
  public async processEvent(
    event: Event,
  ): Promise<ClaraSession> {

    const recentJournalActions = this.journal
      .getEntries()
      .filter((entry) => entry.type === JournalEntryType.ACTION)
      .slice(-5)
      .map((entry) => ({
        summary: entry.summary,
        details: entry.details,
        createdAt: entry.createdAt,
      }));

    const payload =
      event.payload && typeof event.payload === "object"
        ? event.payload as Record<string, unknown>
        : {};

    const contextualEvent: Event = {
      ...event,
      payload: {
        ...payload,
        recentJournalActions,
      },
    };

    this.session = await orchestrate(
      this.session,
      contextualEvent,
    );

    if (this.session.recommendation) {
      this.journal.addEntry(
        writeCognitiveEntry(this.session.recommendation),
      );
    }

    return this.session;

  }

  /**
   * Records a completed gated execution cycle.
   * The caller remains responsible for applying VERIFIED outcomes to Mission.
   */
  public recordExecution(
    intent: ExecutionIntent,
    result: ExecutionCoordinatorResult,
  ): void {
    this.journal.addEntry(
      writeOperationalEntry(intent, result),
    );
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

  /**
   * Returns Clara's operational journal.
   */
  public getJournal(): Journal {
    return this.journal;
  }

}
