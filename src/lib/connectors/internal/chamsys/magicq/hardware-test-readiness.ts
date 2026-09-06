import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import {
  MAGICQ_CONNECTION_PROVIDER,
  type MagicQConnectionConfigurationRepository,
} from "./connection-target-resolver";
import {
  MAGICQ_CREP_DEFAULT_PORT,
  MAGICQ_INTENSITY_CHANNEL_MAX,
  MAGICQ_INTENSITY_CHANNEL_MIN,
} from "./crep";

export type MagicQHardwareTestPlan = {
  workspaceId: string;
  connectionId: string;
  fixtureId: string;
  expectedChannelNumber: number;
  expectedHost: string;
  expectedPort?: number;
};

export type MagicQHardwareTestReadiness = {
  ready: true;
  host: string;
  port: number;
  channelNumber: number;
};

/**
 * Fail-closed preflight for the first physical MagicQ/MQ50 test.
 *
 * This guard performs no network operation. It proves that the persisted
 * Universal Connection and installation-specific MagicQ configuration still
 * match an operator-approved test plan before the network gate is enabled.
 */
export async function assertMagicQHardwareTestReady(
  connections: ConnectionRepository,
  configurations: MagicQConnectionConfigurationRepository,
  plan: MagicQHardwareTestPlan,
): Promise<MagicQHardwareTestReadiness> {
  const workspaceId = plan.workspaceId.trim();
  const connectionId = plan.connectionId.trim();
  const fixtureId = plan.fixtureId.trim();
  const expectedHost = plan.expectedHost.trim();

  if (!workspaceId || !connectionId || !fixtureId || !expectedHost) {
    throw new TypeError("MagicQ hardware test plan identifiers and host must be non-empty.");
  }
  if (
    !Number.isInteger(plan.expectedChannelNumber) ||
    plan.expectedChannelNumber < MAGICQ_INTENSITY_CHANNEL_MIN ||
    plan.expectedChannelNumber > MAGICQ_INTENSITY_CHANNEL_MAX
  ) {
    throw new RangeError("MagicQ hardware test expected channel is invalid.");
  }

  const expectedPort = plan.expectedPort ?? MAGICQ_CREP_DEFAULT_PORT;
  if (!Number.isInteger(expectedPort) || expectedPort < 1 || expectedPort > 65535) {
    throw new RangeError("MagicQ hardware test expected port is invalid.");
  }

  const connection = await connections.findById(connectionId);
  if (!connection) throw new Error("MAGICQ_CONNECTION_NOT_FOUND");
  if (connection.workspaceId !== workspaceId) throw new Error("MAGICQ_WORKSPACE_MISMATCH");
  if (connection.provider !== MAGICQ_CONNECTION_PROVIDER) throw new Error("MAGICQ_PROVIDER_MISMATCH");
  if (connection.status !== "ACTIVE") throw new Error("MAGICQ_CONNECTION_NOT_ACTIVE");

  const configuration = await configurations.findByConnectionId(connectionId);
  if (!configuration) throw new Error("MAGICQ_CONFIGURATION_NOT_FOUND");

  const actualPort = configuration.port ?? MAGICQ_CREP_DEFAULT_PORT;
  const actualChannel = configuration.fixtureChannels[fixtureId];

  if (configuration.host !== expectedHost) throw new Error("MAGICQ_HOST_MISMATCH");
  if (actualPort !== expectedPort) throw new Error("MAGICQ_PORT_MISMATCH");
  if (actualChannel !== plan.expectedChannelNumber) throw new Error("MAGICQ_FIXTURE_CHANNEL_MISMATCH");

  return {
    ready: true,
    host: configuration.host,
    port: actualPort,
    channelNumber: actualChannel,
  };
}
