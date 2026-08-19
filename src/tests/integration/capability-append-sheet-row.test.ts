import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { CapabilityEngine } =
    await import("@/lib/capabilities/capability-engine");

  console.log("\n=== APPEND SHEET ROW CAPABILITY TEST ===");

  const spreadsheetId =
    "1gEv7eAmEv_cca0jR-6d9c_vqY6_nwFNxgwsCJUmpFxQ";

  const sheetName =
    "Feuille 1";

  const engine =
    new CapabilityEngine();

  const result =
    await engine.execute({
      capabilityId: "append-sheet-row",
      context: {
        spreadsheetId,
        sheetName,
        range: `${sheetName}!A:C`,
        values: [
          [
            "Capability",
            "VALIDATED",
            "Clara OS",
          ],
        ],
      },
    });

  console.log("\nRésultat :");
  console.dir(result, { depth: null });

  if (!result.success) {
    throw new Error(
      `Capability append-sheet-row échouée : ${result.message}`,
    );
  }

  console.log("\n=== TEST RÉUSSI ===");
  console.log(
    "Capability : append-sheet-row",
  );
  console.log(
    "Google Sheets → ligne ajoutée",
  );
  console.log(
    "Message :",
    result.message,
  );
}

main().catch((error) => {
  console.error("\n=== TEST EN ERREUR ===");
  console.error(error);
  process.exitCode = 1;
});
