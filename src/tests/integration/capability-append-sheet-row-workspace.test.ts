import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TEST_SPREADSHEET_ID =
  "1gEv7eAmEv_cca0jR-6d9c_vqY6_nwFNxgwsCJUmpFxQ";

const TEST_RANGE =
  "Feuille 1";

async function main() {

  console.log(
    "\n=== APPEND SHEET ROW — WORKSPACE E2E TEST ===",
  );

  /*
   * Google-dependent modules are imported only
   * after .env.local has been loaded.
   */
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
    clearRange,
  } = await import(
    "@/lib/connectors/google/sheets"
  );

  const previousWorkspace =
    loadWorkspace();

  if (!previousWorkspace) {
    throw new Error(
      "Workspace précédent introuvable.",
    );
  }

  try {

    console.log(
      "\n=== CONFIGURATION TEMPORAIRE ===",
    );

    saveWorkspace({

      ...previousWorkspace,

      spreadsheets:
        previousWorkspace.spreadsheets.map(
          (spreadsheet) =>
            spreadsheet.role === "crm"
              ? {
                  ...spreadsheet,
                  spreadsheetId:
                    TEST_SPREADSHEET_ID,
                }
              : spreadsheet,
        ),

    });

    console.log(
      "CRM → spreadsheet de test réel",
    );

    const workflow =
      new AppendSheetRowWorkflow();

    console.log(
      "\n=== APPEND VIA CAPABILITY ===",
    );

    const result =
      await workflow.execute({

        role: "crm",

        range: TEST_RANGE,

        rows: [
          [
            "Clara OS E2E",
            "TEST",
            "Workspace Resolver",
          ],
        ],

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
      result.spreadsheetId !==
      TEST_SPREADSHEET_ID
    ) {
      throw new Error(
        "La capability n'a pas utilisé le spreadsheetId résolu.",
      );
    }

    if (result.affectedRows !== 1) {
      throw new Error(
        `Nombre de lignes inattendu: ${result.affectedRows}`,
      );
    }

    console.log(
      "\n=== TEST CAPABILITY RÉUSSI ===",
    );

    console.log(
      "role crm → Workspace Resolver → OK",
    );

    console.log(
      "spreadsheetId → résolu → OK",
    );

    console.log(
      "append réel Google Sheets → OK",
    );

    console.log(
      "\n=== NETTOYAGE GOOGLE SHEETS ===",
    );

    await clearRange({

      spreadsheetId:
        TEST_SPREADSHEET_ID,

      range:
        TEST_RANGE,

    });

    console.log(
      "Ligne de test supprimée.",
    );

  } finally {

    saveWorkspace(
      previousWorkspace,
    );

    console.log(
      "\n=== WORKSPACE RESTAURÉ ===",
    );

  }

  console.log(
    "\n=== TEST E2E RÉUSSI ===",
  );

}

main().catch((error) => {

  console.error(
    "\n=== TEST EN ERREUR ===",
  );

  console.error(error);

  process.exit(1);

});
