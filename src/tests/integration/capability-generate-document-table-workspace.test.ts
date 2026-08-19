import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {

  const {
    GenerateDocumentWorkflow,
  } = await import(
    "@/lib/capabilities/generate-document/workflow"
  );

  const {
    getDocument,
  } = await import(
    "@/lib/connectors/google/docs"
  );

  const {
    deleteFile,
  } = await import(
    "@/lib/connectors/google/drive"
  );

  console.log(
    "\n=== GENERATE DOCUMENT + TABLE — WORKSPACE E2E TEST ===",
  );

  let documentId: string | undefined;

  try {

    console.log(
      "\n=== GENERATION DU DOCUMENT ===",
    );

    const workflow =
      new GenerateDocumentWorkflow();

    const result =
      await workflow.execute({

        title:
          "Clara OS — Test Document",

        objective:
          "Créer un document de test Google Docs avec un tableau.",

        audience:
          "Test interne Clara OS",

        language:
          "français",

        tone:
          "professionnel",

        table: {

          rows:
            5,

          columns:
            4,

        },

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
        `Generate document failed: ${result.message}`,
      );

    }

    if (!result.documentId) {

      throw new Error(
        "Generate document did not return a documentId.",
      );

    }

    documentId =
      result.documentId;

    console.log(
      `\nDocument créé → ${documentId}`,
    );

    console.log(
      `URL → ${result.documentUrl ?? "non fournie"}`,
    );

    console.log(
      "\n=== LECTURE DU DOCUMENT GOOGLE ===",
    );

    const document =
      await getDocument({

        documentId,

      });

    const content =
      document.body?.content ?? [];

    const tables =
      content.filter(
        (element) =>
          element.table !== undefined,
      );

    console.log(
      `Éléments du document → ${content.length}`,
    );

    console.log(
      `Tableaux détectés → ${tables.length}`,
    );

    if (tables.length !== 1) {

      throw new Error(
        `Expected 1 table, received ${tables.length}.`,
      );

    }

    const table =
      tables[0].table;

    const rows =
      table?.tableRows?.length ?? 0;

    const columns =
      table?.tableRows?.[0]?.tableCells?.length ?? 0;

    console.log(
      `Dimensions détectées → ${rows} lignes × ${columns} colonnes`,
    );

    if (rows !== 5) {

      throw new Error(
        `Expected 5 rows, received ${rows}.`,
      );

    }

    if (columns !== 4) {

      throw new Error(
        `Expected 4 columns, received ${columns}.`,
      );

    }

    console.log(
      "\n=== TEST GENERATE DOCUMENT + TABLE RÉUSSI ===",
    );

    console.log(
      "OpenAI → OK",
    );

    console.log(
      "Google Docs create → OK",
    );

    console.log(
      "Google Docs content → OK",
    );

    console.log(
      "Google Docs insertTable → OK",
    );

    console.log(
      "Google Docs read → OK",
    );

    console.log(
      "Table 5 × 4 → OK",
    );

  } finally {

    if (documentId) {

      console.log(
        "\n=== NETTOYAGE GOOGLE DRIVE ===",
      );

      await deleteFile({

        fileId:
          documentId,

      });

      console.log(
        "Document de test supprimé.",
      );

    }

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
