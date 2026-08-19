import { canExecuteAutonomously } from "@/modules/missions/autonomy-gate";
import type { MissionTask } from "@/modules/missions/types/Mission";

const autonomousTask: MissionTask = {
  id: "task-autonomous-test",
  title: "Organiser le document de test",
  completed: false,
  execution: {
    capabilityId: "organize-drive",
    context: {
      fileId: "file-test-123",
      folderName: "[TEST] Clara OS",
    },
    autonomous: true,
  },
};

const manualTask: MissionTask = {
  id: "task-manual-test",
  title: "Organiser manuellement le document de test",
  completed: false,
  execution: {
    capabilityId: "organize-drive",
    context: {
      fileId: "file-test-123",
      folderName: "[TEST] Clara OS",
    },
    autonomous: false,
  },
};

const completedTask: MissionTask = {
  ...autonomousTask,
  id: "task-completed-test",
  completed: true,
};

console.log("\n=== AUTONOMY GATE TEST ===");

const autonomousResult =
  canExecuteAutonomously(autonomousTask);

const manualResult =
  canExecuteAutonomously(manualTask);

const completedResult =
  canExecuteAutonomously(completedTask);

console.log("Autonomous :", autonomousResult);
console.log("Manual     :", manualResult);
console.log("Completed  :", completedResult);

if (autonomousResult !== true) {
  throw new Error(
    "Une tâche explicitement autonome doit être autorisée.",
  );
}

if (manualResult !== false) {
  throw new Error(
    "Une tâche non autonome doit être refusée.",
  );
}

if (completedResult !== false) {
  throw new Error(
    "Une tâche terminée doit être refusée.",
  );
}

console.log("\n=== TEST RÉUSSI ===");
console.log("Autonomous → autorisée");
console.log("Manual     → refusée");
console.log("Completed  → refusée");
