import { MAKE_CAPABILITIES } from "@/lib/connectors/make";
import type { OperationalCapabilityResult } from "../operational-result";
import { PREPARE_MISSION_DRIVE_CAPABILITY_ID } from "./capability";

export const CREATE_DRIVE_FOLDER_SCENARIO_KEY = "create-drive-folder" as const;
export const ARCHIVE_DOCUMENT_SCENARIO_KEY = "archive-document" as const;
export const MOVE_DRIVE_DOCUMENT_SCENARIO_KEY = "move-drive-document" as const;

export interface MissionDriveDocumentInput {
  readonly fileName: string;
  readonly content: string;
}

export interface PrepareMissionDriveContext {
  readonly missionId: string;
  readonly folderName: string;
  readonly document?: MissionDriveDocumentInput;
}

export interface MakeScenarioExecutor {
  execute(
    capabilityId: string,
    workspaceId: string | undefined,
    context: unknown,
  ): Promise<OperationalCapabilityResult>;
}

function fail(message: string): OperationalCapabilityResult {
  return {
    capabilityId: PREPARE_MISSION_DRIVE_CAPABILITY_ID,
    success: false,
    provider: "make",
    status: "failed",
    error: {
      code: "INVALID_INPUT",
      message,
      retryable: false,
    },
  };
}

function normalizeContext(context: unknown): PrepareMissionDriveContext | null {
  const candidate = context as Partial<PrepareMissionDriveContext> | null;
  const missionId = typeof candidate?.missionId === "string" ? candidate.missionId.trim() : "";
  const folderName = typeof candidate?.folderName === "string" ? candidate.folderName.trim() : "";
  if (!missionId || !folderName) return null;

  let document: MissionDriveDocumentInput | undefined;
  if (candidate?.document) {
    const fileName = typeof candidate.document.fileName === "string" ? candidate.document.fileName.trim() : "";
    const content = typeof candidate.document.content === "string" ? candidate.document.content.trim() : "";
    if (!fileName || !content) return null;
    document = { fileName, content };
  }

  return { missionId, folderName, document };
}

function readString(data: unknown, key: string): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Prepares a mission's Drive workspace using small bounded Make capabilities.
 * Clara OS remains the orchestrator: Make only executes each external step.
 */
export async function executePrepareMissionDriveCapability(
  makeExecutor: MakeScenarioExecutor,
  workspaceId: string | undefined,
  context: unknown,
): Promise<OperationalCapabilityResult> {
  const payload = normalizeContext(context);
  if (!payload) {
    return fail("missionId and folderName are required; document requires fileName and content.");
  }

  const folderResult = await makeExecutor.execute(
    MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    workspaceId,
    {
      scenarioKey: CREATE_DRIVE_FOLDER_SCENARIO_KEY,
      payload: {
        workspaceId,
        missionId: payload.missionId,
        folderName: payload.folderName,
      },
    },
  );

  if (!folderResult.success) {
    return { ...folderResult, capabilityId: PREPARE_MISSION_DRIVE_CAPABILITY_ID };
  }

  const folderId = readString(folderResult.data, "folderId");
  const folderLink = readString(folderResult.data, "webViewLink");
  if (!folderId) {
    return {
      capabilityId: PREPARE_MISSION_DRIVE_CAPABILITY_ID,
      success: false,
      provider: "make",
      status: "failed",
      error: {
        code: "INVALID_PROVIDER_RESPONSE",
        message: "Drive folder creation completed without returning a folderId.",
        retryable: false,
      },
    };
  }

  if (!payload.document) {
    return {
      ...folderResult,
      capabilityId: PREPARE_MISSION_DRIVE_CAPABILITY_ID,
      data: {
        missionId: payload.missionId,
        folderId,
        folderName: payload.folderName,
        folderLink,
      },
    };
  }

  const archiveResult = await makeExecutor.execute(
    MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    workspaceId,
    {
      scenarioKey: ARCHIVE_DOCUMENT_SCENARIO_KEY,
      payload: {
        workspaceId,
        missionId: payload.missionId,
        fileName: payload.document.fileName,
        content: payload.document.content,
      },
    },
  );

  if (!archiveResult.success) {
    return { ...archiveResult, capabilityId: PREPARE_MISSION_DRIVE_CAPABILITY_ID };
  }

  const fileId = readString(archiveResult.data, "fileId");
  if (!fileId) {
    return {
      capabilityId: PREPARE_MISSION_DRIVE_CAPABILITY_ID,
      success: false,
      provider: "make",
      status: "failed",
      error: {
        code: "INVALID_PROVIDER_RESPONSE",
        message: "Document archive completed without returning a fileId.",
        retryable: false,
      },
    };
  }

  const moveResult = await makeExecutor.execute(
    MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    workspaceId,
    {
      scenarioKey: MOVE_DRIVE_DOCUMENT_SCENARIO_KEY,
      payload: {
        workspaceId,
        missionId: payload.missionId,
        fileId,
        folderId,
      },
    },
  );

  if (!moveResult.success) {
    return { ...moveResult, capabilityId: PREPARE_MISSION_DRIVE_CAPABILITY_ID };
  }

  return {
    ...moveResult,
    capabilityId: PREPARE_MISSION_DRIVE_CAPABILITY_ID,
    data: {
      missionId: payload.missionId,
      folderId,
      folderName: payload.folderName,
      folderLink,
      fileId,
      fileName: payload.document.fileName,
      documentLink: readString(moveResult.data, "webViewLink") ?? readString(archiveResult.data, "webViewLink"),
    },
  };
}
