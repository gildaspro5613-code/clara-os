import { getWorkspaceSpreadsheet } from "@/lib/core/workspace/workspace-resolver";

async function main() {

  console.log("\n=== CLARA WORKSPACE RESOLVER TEST ===");

  const roles = [
    "crm",
    "prospects",
    "clients",
    "production",
  ] as const;

  for (const role of roles) {

    const spreadsheet =
      getWorkspaceSpreadsheet(role);

    console.log(`\n=== ${role.toUpperCase()} ===`);

    console.log(
      spreadsheet
        ? JSON.stringify(spreadsheet, null, 2)
        : "NOT FOUND",
    );

    if (!spreadsheet) {
      throw new Error(
        `Workspace spreadsheet not found: ${role}`,
      );
    }

    if (!spreadsheet.spreadsheetId) {
      throw new Error(
        `Missing spreadsheetId: ${role}`,
      );
    }

  }

  console.log("\n=== TEST RÉUSSI ===");
  console.log(
    "CRM        → résolu",
  );
  console.log(
    "Prospects  → résolu",
  );
  console.log(
    "Clients    → résolu",
  );
  console.log(
    "Production → résolu",
  );

}

main().catch((error) => {

  console.error(
    "\n=== TEST EN ERREUR ===",
  );

  console.error(error);

  process.exit(1);

});
