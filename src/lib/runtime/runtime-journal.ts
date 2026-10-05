import type { Journal } from "@/lib/core/journal";
import { writeActionEntry } from "@/lib/core/journal-writer";

export async function writeRuntimeResultToJournal(
  journal: Pick<Journal, "addEntry">,
  capabilityId: string,
  result: { success: boolean; message: string },
): Promise<void> {
  await journal.addEntry(writeActionEntry(
    `Runtime · ${capabilityId}`,
    `${result.success ? "Succès" : "Échec"} · ${result.message}`,
  ));
}
