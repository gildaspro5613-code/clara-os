import assert from "node:assert/strict";
import test from "node:test";

import { PREPARE_MISSION_DRIVE_CAPABILITY_ID } from "@/lib/capabilities/mission-drive/capability";
import {
  ARCHIVE_DOCUMENT_SCENARIO_KEY,
  CREATE_DRIVE_FOLDER_SCENARIO_KEY,
  MOVE_DRIVE_DOCUMENT_SCENARIO_KEY,
  executePrepareMissionDriveCapability,
  type MakeScenarioExecutor,
} from "@/lib/capabilities/mission-drive/executor";
import { MAKE_CAPABILITIES } from "@/lib/connectors/make";

test("prepare-mission-drive orchestrates bounded Make scenarios without exposing Make to the Brain", async () => {
  const calls: Array<{ capabilityId: string; workspaceId?: string; context: unknown }> = [];
  const makeExecutor: MakeScenarioExecutor = {
    async execute(capabilityId, workspaceId, context) {
      calls.push({ capabilityId, workspaceId, context });
      const scenarioKey = (context as { scenarioKey?: string }).scenarioKey;

      if (scenarioKey === CREATE_DRIVE_FOLDER_SCENARIO_KEY) {
        return {
          capabilityId,
          success: true,
          provider: "make",
          status: "completed",
          data: { folderId: "folder-1", webViewLink: "https://drive/folder-1" },
        };
      }

      if (scenarioKey === ARCHIVE_DOCUMENT_SCENARIO_KEY) {
        return {
          capabilityId,
          success: true,
          provider: "make",
          status: "completed",
          data: { fileId: "file-1", webViewLink: "https://drive/file-1" },
        };
      }

      return {
        capabilityId,
        success: true,
        provider: "make",
        status: "completed",
        data: { fileId: "file-1", webViewLink: "https://drive/file-1" },
      };
    },
  };

  const result = await executePrepareMissionDriveCapability(
    makeExecutor,
    "workspace-1",
    {
      missionId: "mission-1",
      folderName: "Mission 1",
      document: { fileName: "Compte rendu", content: "Contenu du compte rendu" },
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.capabilityId, PREPARE_MISSION_DRIVE_CAPABILITY_ID);
  assert.deepEqual(result.data, {
    missionId: "mission-1",
    folderId: "folder-1",
    folderName: "Mission 1",
    folderLink: "https://drive/folder-1",
    fileId: "file-1",
    fileName: "Compte rendu",
    documentLink: "https://drive/file-1",
  });
  assert.deepEqual(calls.map((call) => (call.context as { scenarioKey: string }).scenarioKey), [
    CREATE_DRIVE_FOLDER_SCENARIO_KEY,
    ARCHIVE_DOCUMENT_SCENARIO_KEY,
    MOVE_DRIVE_DOCUMENT_SCENARIO_KEY,
  ]);
  assert.ok(calls.every((call) => call.capabilityId === MAKE_CAPABILITIES.SCENARIO_EXECUTE));
});

test("prepare-mission-drive can create the mission folder without a document", async () => {
  const makeExecutor: MakeScenarioExecutor = {
    async execute(capabilityId) {
      return {
        capabilityId,
        success: true,
        provider: "make",
        status: "completed",
        data: { folderId: "folder-1", webViewLink: "https://drive/folder-1" },
      };
    },
  };

  const result = await executePrepareMissionDriveCapability(
    makeExecutor,
    "workspace-1",
    { missionId: "mission-1", folderName: "Mission 1" },
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.data, {
    missionId: "mission-1",
    folderId: "folder-1",
    folderName: "Mission 1",
    folderLink: "https://drive/folder-1",
  });
});

test("prepare-mission-drive rejects incomplete input before external execution", async () => {
  let called = false;
  const makeExecutor: MakeScenarioExecutor = {
    async execute() {
      called = true;
      throw new Error("Make should not be called");
    },
  };

  const result = await executePrepareMissionDriveCapability(
    makeExecutor,
    "workspace-1",
    { missionId: "mission-1", folderName: "" },
  );

  assert.equal(called, false);
  assert.equal(result.success, false);
  assert.equal(result.capabilityId, PREPARE_MISSION_DRIVE_CAPABILITY_ID);
  assert.equal(result.error?.code, "INVALID_INPUT");
});
