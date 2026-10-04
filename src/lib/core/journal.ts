/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : journal.ts
 * Responsibility :
 * Stores Clara's operational journal.
 * ============================================
 */

import {
  JournalEntry,
} from "./journal-entry";
import {
  clearJournalEntries,
  loadJournalEntries,
  saveJournalEntry,
} from "./store/journal-store";

/**
 * Clara's operational journal.
 */
export class Journal {
  private readonly entries: JournalEntry[] = [];
  private hydrated = false;

  public async hydrate(): Promise<void> {
    if (this.hydrated) return;
    const entries = await loadJournalEntries();
    this.entries.splice(0, this.entries.length, ...entries);
    this.hydrated = true;
  }

  public async addEntry(entry: JournalEntry): Promise<void> {
    await this.hydrate();
    this.entries.push(entry);
    await saveJournalEntry(entry);
  }

  public async getEntries(): Promise<readonly JournalEntry[]> {
    await this.hydrate();
    return this.entries;
  }

  public async getLatestEntry(): Promise<JournalEntry | undefined> {
    await this.hydrate();
    return this.entries.at(-1);
  }

  public async clear(): Promise<void> {
    await this.hydrate();
    this.entries.length = 0;
    await clearJournalEntries();
  }
}