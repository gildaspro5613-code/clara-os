import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { createSheet } =
    await import("@/lib/connectors/google/sheets/create-sheet");

  const { GoogleSheetsEngine } =
    await import("@/lib/connectors/internal/google/sheets/google-sheets-engine");

  console.log("\n=== GOOGLE SHEETS REAL CRUD TEST ===");

  const created = await createSheet({
    title: "[TEST] Clara OS — Runtime Sheets",
    locale: "fr_FR",
  });

  console.log("\nSpreadsheet créé :");
  console.log("ID  :", created.spreadsheetId);
  console.log("URL :", created.spreadsheetUrl);
  console.log(
    "Sheet :",
    created.sheets.map((sheet) => sheet.title).join(", "),
  );

  const sheetName = created.sheets[0]?.title;

  if (!sheetName) {
    throw new Error("Aucune feuille Google Sheets créée.");
  }

  const engine = new GoogleSheetsEngine();

  console.log("\n=== WRITE ===");

  const writeResult = await engine.write({
    spreadsheetId: created.spreadsheetId,
    sheetName,
    range: `${sheetName}!A1:C2`,
    values: [
      ["Nom", "Statut", "Source"],
      ["Clara", "ACTIVE", "TEST"],
    ],
  });

  console.dir(writeResult, { depth: null });

  if (!writeResult.success) {
    throw new Error("WRITE Google Sheets échoué.");
  }

  console.log("\n=== READ ===");

  const readResult = await engine.read({
    spreadsheetId: created.spreadsheetId,
    sheetName,
    range: `${sheetName}!A1:C2`,
  });

  console.dir(readResult, { depth: null });

  if (
    readResult.values?.[1]?.[0] !== "Clara" ||
    readResult.values?.[1]?.[1] !== "ACTIVE"
  ) {
    throw new Error(
      "Les données écrites ne sont pas correctement relues.",
    );
  }

  console.log("\n=== UPDATE ===");

  const updateResult = await engine.update({
    spreadsheetId: created.spreadsheetId,
    sheetName,
    range: `${sheetName}!B2:C2`,
    values: [
      ["READY", "RUNTIME"],
    ],
  });

  console.dir(updateResult, { depth: null });

  if (!updateResult.success) {
    throw new Error("UPDATE Google Sheets échoué.");
  }

  const verifyUpdate = await engine.read({
    spreadsheetId: created.spreadsheetId,
    sheetName,
    range: `${sheetName}!A1:C2`,
  });

  console.log("\nAprès UPDATE :");
  console.dir(verifyUpdate.values, { depth: null });

  if (
    verifyUpdate.values?.[1]?.[0] !== "Clara" ||
    verifyUpdate.values?.[1]?.[1] !== "READY" ||
    verifyUpdate.values?.[1]?.[2] !== "RUNTIME"
  ) {
    throw new Error(
      "La modification Google Sheets n'est pas correctement appliquée.",
    );
  }

  console.log("\n=== APPEND ===");

  const appendResult = await engine.write({
    spreadsheetId: created.spreadsheetId,
    sheetName,
    range: `${sheetName}!A3:C3`,
    values: [
      ["Mission", "PENDING", "Clara OS"],
    ],
  });

  console.dir(appendResult, { depth: null });

  console.log("\n=== CLEAR ===");

  const deleteResult = await engine.delete({
    spreadsheetId: created.spreadsheetId,
    sheetName,
    range: `${sheetName}!A3:C3`,
  });

  console.dir(deleteResult, { depth: null });

  const verifyClear = await engine.read({
    spreadsheetId: created.spreadsheetId,
    sheetName,
    range: `${sheetName}!A3:C3`,
  });

  console.log("\nAprès CLEAR :");
  console.dir(verifyClear.values, { depth: null });

  console.log("\n=== TEST RÉUSSI ===");
  console.log("Create → OK");
  console.log("Write  → OK");
  console.log("Read   → OK");
  console.log("Update → OK");
  console.log("Clear  → OK");
  console.log("\nSpreadsheet de test :", created.spreadsheetId);
  console.log("URL :", created.spreadsheetUrl);
}

main().catch((error) => {
  console.error("\n=== TEST EN ERREUR ===");
  console.error(error);
  process.exitCode = 1;
});
