import { missionFromBrain } from "@/modules/missions/mission-from-brain";
import type { BrainDashboard } from "@/lib/brain/dashboard";
import {
  DecisionPriority,
  EventType,
  RecommendationConfidence,
  TaskStatus,
} from "@/types";

const dashboard: BrainDashboard = {
  context: {
    event: {
      id: "event-test-drive",
      type: EventType.USER_MESSAGE,
      source: "test",
      timestamp: new Date(),
      payload: {
        message:
          "Organiser le document [TEST] Clara OS — Runtime Mission dans le dossier [TEST] Clara OS",
      },
    },
    now: new Date(),
    metadata: {},
  },

  memory: {
    shortTerm: [],
    longTerm: [],
    facts: [],
  },

  sources: [
    {
      available: true,
      source: "google-drive",
      data: {
        available: true,
        source: "google-drive",
        query: "[TEST] Clara OS — Runtime Mission",
        files: [
          {
            id: "file-test-123",
            name: "[TEST] Clara OS — Runtime Mission",
            mimeType:
              "application/vnd.google-apps.document",
            url: "https://drive.google.com/test",
          },
        ],
      },
      summary: "1 fichier de test disponible.",
    },
  ],

  understanding: {
    intent: "organiser un document dans Google Drive",
    summary:
      "Le document doit être organisé dans le dossier cible.",
    confidence: 1,
    entities: [
      "[TEST] Clara OS — Runtime Mission",
      "[TEST] Clara OS",
    ],
    actions: [
      "Organiser le document [TEST] Clara OS — Runtime Mission dans le dossier [TEST] Clara OS",
    ],
    nextAction:
      "Organiser le document [TEST] Clara OS — Runtime Mission dans le dossier [TEST] Clara OS",
    importance: 0.5,
    urgency: 0.5,
    impact: 0.5,
  },

  decision: {
    id: "decision-test-drive",
    objective: {
      id: "objective-test-drive",
      title: "Organiser les documents",
      description:
        "Organiser les documents de Clara OS dans Google Drive.",
      priority: 1,
      completed: false,
    },
    summary:
      "Organiser le document de test dans Google Drive.",
    priority: DecisionPriority.MEDIUM,
    actions: [
      "Organiser le document [TEST] Clara OS — Runtime Mission dans le dossier [TEST] Clara OS",
    ],
    nextAction:
      "Organiser le document [TEST] Clara OS — Runtime Mission dans le dossier [TEST] Clara OS",
    createdAt: new Date(),
  },

  tasks: [
    {
      id: "task-test-drive",
      decision: undefined as never,
      title:
        "Organiser le document [TEST] Clara OS — Runtime Mission dans le dossier [TEST] Clara OS",
      description:
        "Action décidée : organiser le document de test.",
      status: TaskStatus.TODO,
      createdAt: new Date(),
    },
  ],

  recommendation: {
    id: "recommendation-test-drive",
    summary:
      "Organiser le document de test.",
    rationale:
      "Le document doit être rangé dans le dossier cible.",
    confidence: RecommendationConfidence.HIGH,
    decision: undefined as never,
    createdAt: new Date(),
  },

  generatedAt: new Date(),
};

const mission =
  missionFromBrain(dashboard);

const task = mission.tasks[0];

console.log("\n=== MISSION AUTONOMY TEST ===");
console.dir(task, { depth: null });

if (!task.execution) {
  throw new Error(
    "La mission ne possède aucune exécution.",
  );
}

if (task.execution.capabilityId !== "organize-drive") {
  throw new Error(
    `Mauvaise capacité : ${task.execution.capabilityId}`,
  );
}

if (!task.execution.autonomous) {
  throw new Error(
    "La capacité organize-drive n'est pas marquée autonome.",
  );
}

const context =
  task.execution.context as {
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
console.log("Capability :", task.execution.capabilityId);
console.log("File ID    :", context.fileId);
console.log("Dossier    :", context.folderName);
console.log("Autonome   :", task.execution.autonomous);
