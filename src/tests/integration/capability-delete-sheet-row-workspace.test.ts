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
  "Clara DELETE TEST",
  "PENDING",
  "delete-sheet-row-e2e",
];

async function main() {

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
    DeleteSheetRowWorkflow,
  } = await import(
    "@/lib/capabilities/delete-sheet-row/workflow"
  );

  const {
    readRange,
    writeRange,
  } = await import(
    "@/lib/connectors/google/sheets"
  );

  console.log(
    "\n=== DELETE SHEET ROW — WORKSPACE E2E TEST ===",
  );

  const workspace =
    loadWorkspace();

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

  saveWorkspace(workspace);

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

        role:
          "crm",

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
      "\n=== LECTURE AVANT DELETE ===",
    );

    const beforeDelete =
      await readRange({

        spreadsheetId:
          TEST_SPREADSHEET_ID,

        range:
          TEST_RANGE,

      });

    console.log(
      JSON.stringify(
        beforeDelete.values,
        null,
        2,
      ),
    );

    console.log(
      "\n=== FIND VIA CAPABILITY ===",
    );

    const find =
      new FindSheetRowWorkflow();

    const findResult =
      await find.execute({

        role:
          "crm",

        range:
          TEST_RANGE,

        column:
          "Nom",

        value:
          "Clara DELETE TEST",

      });

    console.log(
      JSON.stringify(
        findResult,
        null,
        2,
      ),
    );

    if (!findResult.success) {

      throw new Error(
        `Find failed: ${findResult.message}`,
      );

    }

    if (
      findResult.matchedRows !== 1
    ) {

      throw new Error(
        `Expected 1 matching row, received ${findResult.matchedRows}.`,
      );

    }

    if (
      findResult.rowIndexes.length !== 1
    ) {

      throw new Error(
        `Expected 1 row index, received ${findResult.rowIndexes.length}.`,
      );

    }

    const rowIndex =
      findResult.rowIndexes[0];

    console.log(
      `\nRow index retrouvé → ${rowIndex}`,
    );

    console.log(
      "\n=== DELETE VIA CAPABILITY ===",
    );

    const deleteWorkflow =
      new DeleteSheetRowWorkflow();

    const deleteResult =
      await deleteWorkflow.execute({

        role:
          "crm",

        sheetName:
          "Feuille 1",

        rowIndex,

      });

    console.log(
      JSON.stringify(
        deleteResult,
        null,
        2,
      ),
    );

    if (!deleteResult.success) {

      throw new Error(
        `Delete failed: ${deleteResult.message}`,
      );

    }

    if (
      deleteResult.deletedRow !== rowIndex
    ) {

      throw new Error(
        `Expected deleted row ${rowIndex}, received ${deleteResult.deletedRow}.`,
      );

    }

    console.log(
      "\n=== VÉRIFICATION APRÈS DELETE ===",
    );

    const afterDelete =
      await readRange({

        spreadsheetId:
          TEST_SPREADSHEET_ID,

        range:
          TEST_RANGE,

      });

    console.log(
      JSON.stringify(
        afterDelete.values,
        null,
        2,
      ),
    );

    const deletedRowStillExists =
      afterDelete.values.some(
        (row) =>
          String(row[0] ?? "")
            .trim()
            .toLowerCase() ===
          "clara delete test".toLowerCase(),
      );

    if (deletedRowStillExists) {

      throw new Error(
        "Deleted test row still exists.",
      );

    }

    console.log(
      "\n=== TEST DELETE RÉUSSI ===",
    );

    console.log(
      "Workspace Resolver → OK",
    );

    console.log(
      "spreadsheetId réel → OK",
    );

    console.log(
      "getSheet → sheetId résolu → OK",
    );

    console.log(
      "find-sheet-row → OK",
    );

    console.log(
      "rowIndex réel → OK",
    );

    console.log(
      "delete-sheet-row → OK",
    );

    console.log(
      "Suppression Google Sheets → OK",
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

    saveWorkspace(
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

  console.error(
    error instanceof Error
      ? error
      : error,
  );

  process.exit(1);

});
