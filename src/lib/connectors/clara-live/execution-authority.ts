/**
 * Clara OS -> Clara Live physical execution authority.
 *
 * Clara OS owns authorization. Clara Live only brokers the already-authorized
 * one-shot command to the local Connector Runtime agent.
 */
import { randomUUID } from "node:crypto";

export interface ClaraLiveExecuteRequest {
  agentId: string;
  connector: string;
  capability: string;
  parameters: Record<string, unknown>;
  sessionId: string;
}

export interface ClaraLiveExecuteReceipt {
  command_id: string;
  state: "QUEUED";
  phase: "EXECUTE";
  authorization_source: "clara-os";
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function authorizeClaraLiveExecution(
  request: ClaraLiveExecuteRequest,
): Promise<ClaraLiveExecuteReceipt> {
  const baseUrl = requiredEnv("CLARA_LIVE_BASE_URL").replace(/\/$/, "");
  if (!baseUrl.startsWith("https://")) {
    throw new Error("CLARA_LIVE_BASE_URL must use HTTPS.");
  }

  const token = requiredEnv("CLARA_OS_PRODUCT_TOKEN");
  const executionAuthorizationId = `exec_${randomUUID()}`;

  const response = await fetch(
    `${baseUrl}/api/connector-runtime/os/agents/${encodeURIComponent(request.agentId)}/commands`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-clara-product": "clara-live",
      },
      body: JSON.stringify({
        connector: request.connector,
        phase: "EXECUTE",
        capability: request.capability,
        parameters: request.parameters,
        session_id: request.sessionId,
        execution_authorization_id: executionAuthorizationId,
      }),
      cache: "no-store",
    },
  );

  const body = (await response.json().catch(() => ({}))) as Partial<ClaraLiveExecuteReceipt> & {
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(body.detail ?? `Clara Live execution broker returned HTTP ${response.status}.`);
  }

  if (
    body.phase !== "EXECUTE" ||
    body.authorization_source !== "clara-os" ||
    body.state !== "QUEUED" ||
    typeof body.command_id !== "string"
  ) {
    throw new Error("Clara Live returned an invalid execution receipt.");
  }

  return body as ClaraLiveExecuteReceipt;
}
