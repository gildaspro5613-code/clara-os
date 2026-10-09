import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "@/lib/core/store/database";

type Query = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

export async function purgeDocumentOperations(query: Query = sql): Promise<number> {
  // Reuse the reviewed maintenance file, included in this route's server trace.
  // Its single UPDATE/CTE is atomic; Neon does not accept BEGIN/COMMIT as part
  // of a multi-command prepared query. No request input becomes SQL.
  const script = await readFile(join(process.cwd(), "db/maintenance/purge_document_operations.sql"), "utf8");
  const normalized = script.replace(/^\s*--[^\n]*$/gm, "").trim();
  const match = /^BEGIN;\s*(WITH[\s\S]+);\s*COMMIT;$/.exec(normalized);
  if (!match || match[1].includes(";")) throw new Error("Invalid maintenance script.");
  const template = Object.assign([match[1]], { raw: [match[1]] }) as TemplateStringsArray;
  const rows = await query(template);
  const row = rows[0];
  if (rows.length !== 1 || !row || typeof row !== "object") throw new Error("Invalid maintenance result.");
  const value = (row as Record<string, unknown>).expired_results_cleared;
  if (typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value))) throw new Error("Invalid maintenance count.");
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid maintenance count.");
  return count;
}
