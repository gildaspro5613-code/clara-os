import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TEST_SPREADSHEET_ID =
  "1gEv7eAmEv_cca0jR-6d9c_vqY6_nwFNxgwsCJUmpFxQ";

const TEST_RANGE =
  "Feuille 1!A:C";

const TEST_HEADERS = [
  "Nom",
  "Statut",
  "Source",
];

const TEST_ROW = [
  "Clara FIND TEST",
  "PENDING",
  "find-sheet-row-e2e",
];

async function main() {

  console.log(
    "\n=== FIND SHEET ROW — WORKSPACE E2E TEST ===",
  );

  const {
    loadWorkspace,
    saveWorkspace,
  } = await import(
    "@/lib/core/workspace/workspace-store"
  );

  const {
    AppendSheetRowWorkflow,
  } = await import(
    "@/lib/capabilities/append-sheet-row/workflow"
  );

  const {
    FindSheetRowWorkflow,
  } = await import(
    "@/lib/capabilities/find-sheet-row/workflow"
  );

  const {
    clearRange,
    readRange,
    writeRange,
  } = await import(
    "@/lib/connectors/google/sheets"
  );

  const workspace =
    await loadWorkspace();

  if (!workspace) {
    throw new Error(
      "Workspace not found.",
    );
  }

  const originalWorkspace =
    JSON.parse(
      JSON.stringify(workspace),
    );

  const crm =
    workspace.spreadsheets.find(
      (spreadsheet) =>
        spreadsheet.role === "crm",
    );

  if (!crm) {
    throw new Error(
      "CRM spreadsheet not found.",
    );
  }

  console.log(
    "\n=== CONFIGURATION TEMPORAIRE ===",
  );

  console.log(
    "CRM → spreadsheet de test réel",
  );

  crm.spreadsheetId =
    TEST_SPREADSHEET_ID;

  await saveWorkspace(workspace);

  let originalValues: unknown[][] = [];

  try {

    console.log(
      "\n=== SAUVEGARDE DU CONTENU ORIGINAL ===",
    );

    const before =
      await readRange({

        spreadsheetId:
          TEST_SPREADSHEET_ID,

        range:
          TEST_RANGE,

      });

    originalValues =
      before.values;

    console.log(
      JSON.stringify(
        originalValues,
        null,
        2,
      ),
    );

    console.log(
      "\n=== PRÉPARATION DU TABLEAU TEST ===",
    );

    await clearRange({
      spreadsheetId:
        TEST_SPREADSHEET_ID,
      range:
        TEST_RANGE,
    });

    await writeRange({

      spreadsheetId:
        TEST_SPREADSHEET_ID,

      range:
        TEST_RANGE,

      values: [
        TEST_HEADERS,
      ],

    });

    console.log(
      "En-têtes → créés.",
    );

    console.log(
      "\n=== CRÉATION DE LA LIGNE TEST ===",
    );

    const append =
      new AppendSheetRowWorkflow();

    const appendResult =
      await append.execute({

        role: "crm",

        range:
          "Feuille 1",

        rows: [
          TEST_ROW,
        ],

      });

    console.log(
      JSON.stringify(
        appendResult,
        null,
        2,
      ),
    );

    if (!appendResult.success) {

      throw new Error(
        `Unable to create test row: ${appendResult.message}`,
      );

    }

    console.log(
      "\n=== LECTURE DE VÉRIFICATION ===",
    );

    const verification =
      await readRange({

        spreadsheetId:
          TEST_SPREADSHEET_ID,

        range:
          TEST_RANGE,

      });

    console.log(
      JSON.stringify(
        verification.values,
        null,
        2,
      ),
    );

    console.log(
      "\n=== FIND VIA CAPABILITY ===",
    );

    const find =
      new FindSheetRowWorkflow();

    const result =
      await find.execute({

        role: "crm",

        range:
          TEST_RANGE,

        column:
          "Nom",

        value:
          "Clara FIND TEST",

      });

    console.log(
      JSON.stringify(
        result,
        null,
        2,
      ),
    );

    if (!result.success) {

      throw new Error(
        `Capability failed: ${result.message}`,
      );

    }

    if (
      result.matchedRows !== 1
    ) {

      throw new Error(
        `Expected 1 matching row, received ${result.matchedRows}.`,
      );

    }

    if (
      result.rowIndexes.length !== 1
    ) {

      throw new Error(
        `Expected 1 row index, received ${result.rowIndexes.length}.`,
      );

    }

    const foundRow =
      result.rows[0];

    const foundRowIndex =
      result.rowIndexes[0];

    console.log(
      `Row index retrouvé → ${foundRowIndex}`,
    );

    if (
      foundRowIndex !== 2
    ) {

      throw new Error(
        `Expected test row at row 2, received row ${foundRowIndex}.`,
      );

    }

    if (
      JSON.stringify(foundRow) !==
      JSON.stringify(TEST_ROW)
    ) {

      throw new Error(
        `Unexpected row returned: ${JSON.stringify(foundRow)}`,
      );

    }

    console.log(
      "\n=== TEST FIND RÉUSSI ===",
    );

    console.log(
      "Workspace Resolver → OK",
    );

    console.log(
      "spreadsheetId réel → OK",
    );

    console.log(
      "Header detection → OK",
    );

    console.log(
      "append-sheet-row → OK",
    );

    console.log(
      "find-sheet-row → OK",
    );

    console.log(
      "Recherche par colonne → OK",
    );

    console.log(
      "Ligne retrouvée exactement → OK",
    );

    console.log(
      "rowIndex réel → OK",
    );

  } finally {

    console.log(
      "\n=== RESTAURATION GOOGLE SHEETS ===",
    );

    await writeRange({

      spreadsheetId:
        TEST_SPREADSHEET_ID,

      range:
        TEST_RANGE,

      values:
        originalValues as (
          string | number | boolean | null
        )[][],

    });

    console.log(
      "Contenu original restauré.",
    );

    await saveWorkspace(
      originalWorkspace,
    );

    console.log(
      "\n=== WORKSPACE RESTAURÉ ===",
    );

  }

}

main().catch((error) => {

  console.error(
    "\n=== TEST EN ERREUR ===",
  );

  console.error(error);

  process.exit(1);

});
