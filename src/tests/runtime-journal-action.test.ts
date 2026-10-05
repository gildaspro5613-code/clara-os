import assert from "node:assert/strict";
import test from "node:test";

import type { JournalEntry } from "@/lib/core/journal-entry";
import { writeRuntimeResultToJournal } from "@/lib/runtime/runtime-journal";

test("a real Runtime capability result writes an ACTION journal entry", async () => {
  const entries: JournalEntry[] = [];
  const journal = {
    async addEntry(entry) { entries.push(entry); },
  };
  await writeRuntimeResultToJournal(journal, "read-calendar", {
    success: true,
    message: "Capability completed.",
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, "ACTION");
  assert.match(entries[0].summary, /read-calendar/);
  assert.match(entries[0].details ?? "", /Succès/);
});
