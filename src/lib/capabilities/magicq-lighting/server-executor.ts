import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { DatabaseMagicQConnectionConfigurationRepository } from "@/lib/connectors/internal/chamsys/magicq/configuration-repository";
import { NodeMagicQUdpDatagramSender } from "@/lib/connectors/internal/chamsys/magicq/node-udp-sender";
import {
  ConfiguredMagicQLightingExecutor,
  FeatureGatedMagicQUdpSender,
  type MagicQNetworkGate,
} from "./configured-executor";
import type { MagicQLightingExecutor } from "./executor";

export const MAGICQ_NETWORK_ENABLE_ENV = "CLARA_MAGICQ_NETWORK_ENABLED";

/**
 * Server-side feature gate. Network is enabled only for the exact value
 * "true". Missing, blank, "1", "yes" and every other value stay disabled.
 */
export class EnvironmentMagicQNetworkGate implements MagicQNetworkGate {
  constructor(
    private readonly readValue: () => string | undefined =
      () => process.env[MAGICQ_NETWORK_ENABLE_ENV],
  ) {}

  isEnabled(): boolean {
    return this.readValue() === "true";
  }
}

/**
 * Production-capable composition root for MagicQ Lighting.
 *
 * It includes a real UDP sender but keeps it behind an exact-match environment
 * gate. No socket is opened until an approved execution reaches sender.send()
 * AND CLARA_MAGICQ_NETWORK_ENABLED=true is present in the server environment.
 */
export function createServerMagicQLightingExecutor(
  gate: MagicQNetworkGate = new EnvironmentMagicQNetworkGate(),
): MagicQLightingExecutor {
  const sender = new FeatureGatedMagicQUdpSender(
    gate,
    new NodeMagicQUdpDatagramSender(),
  );

  return new ConfiguredMagicQLightingExecutor(
    new DatabaseConnectionRepository(),
    new DatabaseMagicQConnectionConfigurationRepository(),
    sender,
  );
}
