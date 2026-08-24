import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TEST_SPREADSHEET_ID =
  "1gEv7eAmEv_cca0jR-6d9c_vqY6_nwFNxgwsCJUmpFxQ";

const TEST_RANGE =
  "Feuille 1";

async function main() {

  console.log(
    "\n=== UPDATE SHEET ROW — WORKSPACE E2E TEST ===",
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
    UpdateSheetRowWorkflow,
  } = await import(
    "@/lib/capabilities/update-sheet-row/workflow"
  );

  const {
    readRange,
    clearRange,
  } = await import(
    "@/lib/connectors/google/sheets"
  );

  const previousWorkspace =
    await loadWorkspace();

  if (!previousWorkspace) {
    throw new Error(
      "Workspace précédent introuvable.",
    );
  }

  try {

    console.log(
      "\n=== CONFIGURATION TEMPORAIRE ===",
    );

    await saveWorkspace({

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

    /*
     * ------------------------------------------------
     * 1. Création de la ligne de référence
     * ------------------------------------------------
     */

    const append =
      new AppendSheetRowWorkflow();

    console.log(
      "\n=== CRÉATION DE LA LIGNE TEST ===",
    );

    const appendResult =
      await append.execute({

        role: "crm",

        range: TEST_RANGE,

        rows: [
          [
            "Clara OS UPDATE",
            "PENDING",
            "E2E",
          ],
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
        `Append failed: ${appendResult.message}`,
      );
    }

    /*
     * ------------------------------------------------
     * 2. Lecture pour déterminer la ligne créée
     * ------------------------------------------------
     */

    console.log(
      "\n=== LECTURE DE VÉRIFICATION ===",
    );

    const beforeUpdate =
      await readRange({

        spreadsheetId:
          TEST_SPREADSHEET_ID,

        range:
          TEST_RANGE,

      });

    console.log(
      JSON.stringify(
        beforeUpdate.values,
        null,
        2,
      ),
    );

    const rowIndex =
      beforeUpdate.values.length;

    if (rowIndex < 1) {
      throw new Error(
        "Impossible de déterminer la ligne de test.",
      );
    }

    /*
     * La ligne ajoutée est la dernière ligne.
     *
     * On suppose que la feuille contient :
     * ligne 1 = en-tête
     * ligne N = ligne test
     */

    const targetRange =
      `Feuille 1!B${rowIndex}:C${rowIndex}`;

    console.log(
      `\nPlage ciblée : ${targetRange}`,
    );

    /*
     * ------------------------------------------------
     * 3. Modification via update-sheet-row
     * ------------------------------------------------
     */

    const update =
      new UpdateSheetRowWorkflow();

    console.log(
      "\n=== UPDATE VIA CAPABILITY ===",
    );

    const updateResult =
      await update.execute({

        role: "crm",

        range:
          targetRange,

        values: [
          [
            "READY",
            "Clara OS",
          ],
        ],

      });

    console.log(
      JSON.stringify(
        updateResult,
        null,
        2,
      ),
    );

    if (!updateResult.success) {
      throw new Error(
        `Update failed: ${updateResult.message}`,
      );
    }

    if (
      updateResult.spreadsheetId !==
      TEST_SPREADSHEET_ID
    ) {
      throw new Error(
        "La capability n'a pas utilisé le spreadsheetId résolu.",
      );
    }

    /*
     * ------------------------------------------------
     * 4. Vérification réelle dans Google Sheets
     * ------------------------------------------------
     */

    console.log(
      "\n=== VÉRIFICATION APRÈS UPDATE ===",
    );

    const afterUpdate =
      await readRange({

        spreadsheetId:
          TEST_SPREADSHEET_ID,

        range:
          `Feuille 1!A${rowIndex}:C${rowIndex}`,

      });

    console.log(
      JSON.stringify(
        afterUpdate.values,
        null,
        2,
      ),
    );

    const updatedRow =
      afterUpdate.values[0];

    if (!updatedRow) {
      throw new Error(
        "Ligne mise à jour introuvable.",
      );
    }

    if (updatedRow[0] !== "Clara OS UPDATE") {
      throw new Error(
        "La première cellule a été modifiée alors qu'elle devait rester intacte.",
      );
    }

    if (updatedRow[1] !== "READY") {
      throw new Error(
        `Statut inattendu après update : ${updatedRow[1]}`,
      );
    }

    if (updatedRow[2] !== "Clara OS") {
      throw new Error(
        `Source inattendue après update : ${updatedRow[2]}`,
      );
    }

    console.log(
      "\n=== TEST UPDATE RÉUSSI ===",
    );

    console.log(
      "Workspace Resolver → OK",
    );

    console.log(
      "spreadsheetId réel → OK",
    );

    console.log(
      "update-sheet-row → OK",
    );

    console.log(
      "Modification ciblée → OK",
    );

    console.log(
      "Vérification Google Sheets → OK",
    );

    /*
     * ------------------------------------------------
     * 5. Nettoyage
     * ------------------------------------------------
     */

    console.log(
      "\n=== NETTOYAGE GOOGLE SHEETS ===",
    );

    await clearRange({

      spreadsheetId:
        TEST_SPREADSHEET_ID,

      range:
        `Feuille 1!A${rowIndex}:C${rowIndex}`,

    });

    console.log(
      "Ligne de test supprimée.",
    );

  } finally {

    await saveWorkspace(
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
