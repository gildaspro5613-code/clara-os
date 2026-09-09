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
import { PostgresJournalRepository } from "./postgres-journal-repository";

export class Clara {

  private session: ClaraSession = createSession();
  private readonly journal = new Journal();
  private readonly journalRepository = new PostgresJournalRepository();

  public async start(): Promise<ClaraSession> {
    this.session = createSession();
    this.session.state = ClaraState.STARTING;
    this.session.updatedAt = new Date();

    await this.processEvent(createSystemEvent());

    this.session.state = ClaraState.WORKING;
    this.session.updatedAt = new Date();
    return this.session;
  }

  public async stop(): Promise<void> {
    this.session.state = ClaraState.STOPPING;
    this.session.updatedAt = new Date();
    this.session.state = ClaraState.STOPPED;
    this.session.updatedAt = new Date();
  }

  public async processEvent(event: Event): Promise<ClaraSession> {
    const durableEntries = await this.journalRepository.recent(20);
    const recentJournalActions = durableEntries
      .filter((entry) => entry.type === JournalEntryType.ACTION)
      .slice(0, 5)
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

    this.session = await orchestrate(this.session, contextualEvent);

    if (this.session.recommendation) {
      const entry = writeCognitiveEntry(this.session.recommendation);
      this.journal.addEntry(entry);
      await this.journalRepository.append(entry);
    }

    return this.session;
  }

  /**
   * Records a completed gated execution cycle in both the local runtime cache
   * and Clara's durable operational Journal.
   */
  public async recordExecution(
    intent: ExecutionIntent,
    result: ExecutionCoordinatorResult,
  ): Promise<void> {
    const entry = writeOperationalEntry(intent, result);
    this.journal.addEntry(entry);
    await this.journalRepository.append(entry);
  }

  public getState(): ClaraState {
    return this.session.state;
  }

  public getSession(): ClaraSession {
    return this.session;
  }

  public getJournal(): Journal {
    return this.journal;
  }

}
