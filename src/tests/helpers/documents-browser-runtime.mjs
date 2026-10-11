/** Explicitly preloaded by the local/CI browser fixture, never application code.
 * This empty Neon protocol fixture allows startup without real database data.
 * Actual archive persistence is tested separately in isolated PostgreSQL.
 */
const database = "postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic";
if (process.env.DATABASE_URL !== database || process.env.POSTGRES_URL) {
  throw new Error("Browser runtime fixture requires its exact synthetic database URL and no POSTGRES_URL.");
}
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (new URL(url).hostname === "api.invalid") {
    return Response.json({ fields: [], rows: [], rowCount: 0, command: "SELECT", rowAsArray: true });
  }
  return original(input, init);
};
