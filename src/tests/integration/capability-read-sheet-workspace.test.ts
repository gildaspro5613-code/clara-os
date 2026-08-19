import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TEST_SPREADSHEET_ID =
  "1gEv7eAmEv_cca0jR-6d9c_vqY6_nwFNxgwsCJUmpFxQ";

const TEST_RANGE =
  "Feuille 1!A1:C10";

async function main() {

  console.log(
    "\n=== READ SHEET — WORKSPACE E2E TEST ===",
  );

  const {
    loadWorkspace,
    saveWorkspace,
  } = await import(
    "@/lib/core/workspace/workspace-store"
  );

  const {
    ReadSheetWorkflow,
  } = await import(
    "@/lib/capabilities/read-sheet/workflow"
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

  try {

    console.log(
      "\n=== READ VIA CAPABILITY ===",
    );

    const workflow =
      new ReadSheetWorkflow();

    const result =
      await workflow.execute({

        role: "crm",

        range:
          TEST_RANGE,

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
        "Workspace Resolver returned an unexpected spreadsheetId.",
      );

    }

    console.log(
      "\n=== TEST READ RÉUSSI ===",
    );

    console.log(
      "Workspace Resolver → OK",
    );

    console.log(
      "spreadsheetId réel → OK",
    );

    console.log(
      "read-sheet → OK",
    );

    console.log(
      "Lecture Google Sheets → OK",
    );

    console.log(
      `Lignes lues → ${result.affectedRows}`,
    );

  } finally {

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

  console.error(error);

  process.exit(1);

});
