/**
 * Universal physical execution authority contract.
 *
 * Clara OS owns authorization. The current Clara Live broker is only the
 * transport host for the local Connector Runtime; equipment domains and
 * provider adapters remain independent from that product boundary.
 */
import { randomUUID } from "node:crypto";

export type PhysicalExecutionDomain =
  | "LIGHT"
  | "SOUND"
  | "SHOW_CONTROL"
  | "SYSTEM";

export interface PhysicalExecuteRequest {
  agentId: string;
  connector: string;
  capability: string;
  parameters: Record<string, unknown>;
  sessionId: string;
  domain?: PhysicalExecutionDomain;
}

export interface PhysicalExecuteReceipt {
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

export type PhysicalExecutionTransport = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export async function authorizePhysicalExecution(
  request: PhysicalExecuteRequest,
  transport: PhysicalExecutionTransport = fetch,
): Promise<PhysicalExecuteReceipt> {
  const baseUrl = requiredEnv("CLARA_LIVE_BASE_URL").replace(/\/$/, "");
  if (!baseUrl.startsWith("https://")) {
    throw new Error("CLARA_LIVE_BASE_URL must use HTTPS.");
  }

  const token = requiredEnv("CLARA_OS_PRODUCT_TOKEN");
  const executionAuthorizationId = `exec_${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 2 * 60_000).toISOString();

  const response = await transport(
    `${baseUrl}/api/connector-runtime/os/agents/${encodeURIComponent(request.agentId)}/commands`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-clara-product": "clara-os",
      },
      body: JSON.stringify({
        connector: request.connector,
        domain: request.domain,
        phase: "EXECUTE",
        capability: request.capability,
        parameters: request.parameters,
        session_id: request.sessionId,
        execution_authorization_id: executionAuthorizationId,
        expires_at: expiresAt,
      }),
      cache: "no-store",
    },
  );

  const body = (await response.json().catch(() => ({}))) as Partial<PhysicalExecuteReceipt> & {
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(body.detail ?? `Connector Runtime broker returned HTTP ${response.status}.`);
  }

  if (
    body.phase !== "EXECUTE" ||
    body.authorization_source !== "clara-os" ||
    body.state !== "QUEUED" ||
    typeof body.command_id !== "string"
  ) {
    throw new Error("Connector Runtime returned an invalid execution receipt.");
  }

  return body as PhysicalExecuteReceipt;
}

export type ClaraLiveExecuteRequest = PhysicalExecuteRequest;
export type ClaraLiveExecuteReceipt = PhysicalExecuteReceipt;
export type ClaraLiveExecutionTransport = PhysicalExecutionTransport;
export const authorizeClaraLiveExecution = authorizePhysicalExecution;
