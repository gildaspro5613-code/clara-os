import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { CapabilityEngine } =
    await import("@/lib/capabilities/capability-engine");

  const engine = new CapabilityEngine();

  const fileId = process.env.TEST_CLARA_DOCUMENT_ID;

  if (!fileId) {
    throw new Error(
      "TEST_CLARA_DOCUMENT_ID is missing. Set it to the documentId of [TEST] Clara OS — Runtime Mission.",
    );
  }

  console.log("\n=== ORGANIZE DRIVE TEST ===");
  console.log("File ID :", fileId);
  console.log("Folder  : [TEST] Clara OS");
  console.log("\nExécution en cours...\n");

  const result = await engine.execute({
    capabilityId: "organize-drive",
    context: {
      fileId,
      folderName: "[TEST] Clara OS",
    },
  });

  console.dir(result, { depth: null });

  if (!result.success) {
    process.exitCode = 1;
    return;
  }

  console.log("\n=== TEST RÉUSSI ===");
  console.log("Le fichier a été organisé dans :", result.message);
}

main().catch((error) => {
  console.error("\n=== TEST EN ERREUR ===");
  console.error(error);
  process.exitCode = 1;
});
