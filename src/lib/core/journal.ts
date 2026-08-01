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

/**
 * Clara's operational journal.
 */
export class Journal {

  /**
   * Stored entries.
   */
  private readonly entries: JournalEntry[] = [];

  /**
   * Adds one entry.
   */
  public addEntry(
    entry: JournalEntry,
  ): void {

    this.entries.push(
      entry,
    );

  }

  /**
   * Returns every entry.
   */
  public getEntries(): readonly JournalEntry[] {

    return this.entries;

  }

  /**
   * Returns the latest entry.
   */
  public getLatestEntry():
    JournalEntry | undefined {

    return this.entries.at(-1);

  }

  /**
   * Clears the journal.
   */
  public clear(): void {

    this.entries.length = 0;

  }

}