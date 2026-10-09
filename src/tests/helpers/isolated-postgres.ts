import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DocumentOperation } from "@/lib/external-capabilities/document-operations";

// This adapter cannot connect to Neon or any arbitrary database/host.
const exec = promisify(execFile);
export function isolatedPostgres(container: string | undefined, database: "postgres" | "neondb" = "postgres") {
async function runSql(statement: string) {
  if (!container || !/^clara-document-registry-test(?:-[a-z0-9]+)?$/.test(container)) throw new Error("Invalid isolated test container");
  const { stdout } = await exec("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", database, "-qAt", "-v", "ON_ERROR_STOP=1", "-c", statement]);
  return stdout;
}
async function query(strings: TemplateStringsArray, ...values: unknown[]): Promise<DocumentOperation[]> {
  const statement = strings.reduce((text, segment, index) => text + segment + (index < values.length
    ? "'" + String(values[index]).replaceAll("'", "''") + "'" : ""), "").trim();
  const returnsRows = /RETURNING \*/.test(statement) || /^SELECT /.test(statement);
  const sql = returnsRows ? (statement.startsWith("SELECT")
    ? `SELECT row_to_json(rows) FROM (${statement}) rows`
    : `WITH rows AS (${statement}) SELECT row_to_json(rows) FROM rows`) : statement;
  const output = await runSql(sql);
  return returnsRows ? output.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
}

return { runSql, query };
}
