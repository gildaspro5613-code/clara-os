import { resolveTaskExecution } from "@/lib/brain/task-execution";
import type { BrainSourceContext } from "@/lib/brain/brain-source";
import type { BrainDriveContext } from "@/lib/brain/drive-context";
import {
  DecisionPriority,
  type Decision,
} from "@/types";

const decision: Decision = {
  id: "decision-test-drive",
  objective: {
    id: "objective-test-drive",
    title: "Organiser les documents",
    description: "Organiser les documents de Clara OS dans Google Drive.",
    priority: 1,
    completed: false,
  },
  summary: "Organiser un document dans Google Drive.",
  priority: DecisionPriority.MEDIUM,
  actions: [],
  createdAt: new Date(),
};

const drive: BrainDriveContext = {
  available: true,
  source: "google-drive",
  query: "[TEST] Clara OS — Runtime Mission",
  files: [
    {
      id: "file-test-123",
      name: "[TEST] Clara OS — Runtime Mission",
      mimeType: "application/vnd.google-apps.document",
      url: "https://drive.google.com/test",
    },
  ],
};

const sources: BrainSourceContext[] = [
  {
    available: true,
    source: "google-drive",
    data: drive,
    summary: "1 fichier de test disponible.",
  },
];

const action =
  "Organiser le document [TEST] Clara OS — Runtime Mission dans le dossier [TEST] Clara OS";

const result = resolveTaskExecution(
  action,
  decision,
  sources,
);

console.log("\n=== TASK EXECUTION DRIVE TEST ===");
console.log("Action :", action);
console.log("\nRésultat :");
console.dir(result, { depth: null });

if (!result) {
  throw new Error("Aucune capacité n'a été résolue.");
}

if (result.capabilityId !== "organize-drive") {
  throw new Error(
    `Mauvaise capacité : ${result.capabilityId}`,
  );
}

const context = result.context as {
  fileId?: string;
  folderName?: string;
};

if (context.fileId !== "file-test-123") {
  throw new Error(
    `Mauvais fileId : ${context.fileId}`,
  );
}

if (context.folderName !== "[TEST] Clara OS") {
  throw new Error(
    `Mauvais folderName : ${context.folderName}`,
  );
}

console.log("\n=== TEST RÉUSSI ===");
console.log("Capability :", result.capabilityId);
console.log("File ID    :", context.fileId);
console.log("Dossier    :", context.folderName);
