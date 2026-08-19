import {
  loadWorkspace,
  saveWorkspace,
} from "@/lib/core/workspace/workspace-store";

async function main() {

  console.log("\n=== CLARA WORKSPACE STORE TEST ===");

  const workspace = {
    companyName: "Melodie Digital",

    companyFolderId:
      "test-company-folder-id",

    spreadsheets: [

      {
        role: "crm" as const,
        title: "Melodie Digital - CRM",
        spreadsheetId: "test-crm-id",
      },

      {
        role: "prospects" as const,
        title: "Melodie Digital - Prospects",
        spreadsheetId: "test-prospects-id",
      },

      {
        role: "clients" as const,
        title: "Melodie Digital - Clients",
        spreadsheetId: "test-clients-id",
      },

      {
        role: "production" as const,
        title: "Melodie Digital - Production",
        spreadsheetId: "test-production-id",
      },

    ],

  };

  console.log("\n=== SAVE ===");

  saveWorkspace(workspace);

  console.log("Workspace sauvegardé.");

  console.log("\n=== LOAD ===");

  const loaded =
    loadWorkspace();

  console.log(
    JSON.stringify(
      loaded,
      null,
      2,
    ),
  );

  if (!loaded) {
    throw new Error(
      "Workspace introuvable après sauvegarde.",
    );
  }

  if (
    loaded.companyName !==
    workspace.companyName
  ) {
    throw new Error(
      "companyName incorrect.",
    );
  }

  if (
    loaded.companyFolderId !==
    workspace.companyFolderId
  ) {
    throw new Error(
      "companyFolderId incorrect.",
    );
  }

  if (
    loaded.spreadsheets.length !==
    workspace.spreadsheets.length
  ) {
    throw new Error(
      "Nombre de spreadsheets incorrect.",
    );
  }

  if (
    loaded.spreadsheets[0].spreadsheetId !==
    "test-crm-id"
  ) {
    throw new Error(
      "CRM spreadsheetId incorrect.",
    );
  }

  console.log("\n=== TEST RÉUSSI ===");
  console.log(
    "Workspace → sauvegarde OK",
  );
  console.log(
    "Workspace → lecture OK",
  );
  console.log(
    "Spreadsheet IDs → conservés",
  );

}

main().catch((error) => {

  console.error(
    "\n=== TEST EN ERREUR ===",
  );

  console.error(error);

  process.exit(1);

});
