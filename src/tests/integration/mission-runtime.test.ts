import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { executeMissionTask } =
    await import("@/modules/missions/execute-mission-task");

  const task = {
    id: "test-task-clara-os",
    title: "[TEST] Créer un document Clara OS",
    completed: false,
    execution: {
      capabilityId: "generate-document",
      autonomous: false,
      context: {
        title: "[TEST] Clara OS — Runtime Mission",
        objective:
          "Valider le parcours Mission → Runtime → Capability Engine → OpenAI → Google Docs.",
        audience: "Équipe Clara OS",
        language: "français",
        tone: "professionnel",
      },
    },
  };

  const mission = {
    id: "test-mission-clara-os",
    title: "[TEST] Runtime Clara OS",
    objective:
      "Valider l'exécution réelle d'une capacité depuis une Mission.",
    status: "active" as const,
    priority: "medium" as const,
    createdAt: new Date(),
    tasks: [task],
    progress: 0,
    nextAction: task.title,
  };

  console.log("\n=== MISSION RUNTIME TEST ===");
  console.log("Mission :", mission.title);
  console.log("Tâche   :", task.title);
  console.log("Capacité:", task.execution.capabilityId);
  console.log("\nExécution en cours...\n");

  const result = await executeMissionTask(task, mission);

  console.dir(result, { depth: null });

  if (!result.success) {
    process.exitCode = 1;
    return;
  }

  console.log("\n=== TEST RÉUSSI ===");
  console.log("Document ID :", result.documentId);
  console.log("Document URL:", result.documentUrl);
}

main().catch((error) => {
  console.error("\n=== TEST EN ERREUR ===");
  console.error(error);
  process.exitCode = 1;
});
