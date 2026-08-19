import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { RuntimeEngine } =
    await import("@/lib/runtime/runtime-engine");

  const { RuntimeFactory } =
    await import("@/lib/runtime/runtime-factory");

  const fileId =
    "108dZ3I485s6TcqgcuUgapWAwchJfbYuHrwZuqGnxA3g";

  const folderName =
    "[TEST] Clara OS";

  console.log("\n=== RUNTIME ORGANIZE DRIVE TEST ===");
  console.log("File ID :", fileId);
  console.log("Dossier :", folderName);
  console.log("\nExécution en cours...\n");

  const runtime =
    RuntimeFactory.create();

  const event =
    RuntimeFactory.createEvent(
      "organize-drive",
      {
        fileId,
        folderName,
      },
      "integration-test",
    );

  const engine =
    new RuntimeEngine();

  const result =
    await engine.run(
      runtime,
      event,
    );

  console.dir(result, { depth: null });

  if (!result.success) {
    throw new Error(
      `Runtime execution failed: ${result.message}`,
    );
  }

  console.log("\n=== TEST RÉUSSI ===");
  console.log(
    "Clara Runtime → organize-drive → Google Drive",
  );
  console.log("Message :", result.message);
}

main().catch((error) => {
  console.error("\n=== TEST EN ERREUR ===");
  console.error(error);
  process.exitCode = 1;
});
