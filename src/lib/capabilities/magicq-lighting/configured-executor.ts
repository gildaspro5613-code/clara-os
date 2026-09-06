import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import {
  MagicQConnectorAdapter,
  MagicQUniversalConnectionTargetResolver,
  type MagicQConnectionConfigurationRepository,
  type MagicQFixtureIntensityRequest,
  type MagicQFixtureIntensityResult,
  type UdpDatagram,
  type UdpDatagramSender,
} from "@/lib/connectors/internal/chamsys/magicq";
import type { MagicQLightingExecutor } from "./executor";

export interface MagicQNetworkGate {
  isEnabled(): boolean;
}

/**
 * Hard fail-closed gate around the UDP boundary.
 *
 * The delegate may later be a real datagram sender, but it is never called
 * unless the gate is explicitly enabled by the composition root.
 */
export class FeatureGatedMagicQUdpSender implements UdpDatagramSender {
  constructor(
    private readonly gate: MagicQNetworkGate,
    private readonly delegate: UdpDatagramSender,
  ) {}

  async send(datagram: UdpDatagram): Promise<void> {
    if (!this.gate.isEnabled()) {
      throw new Error("MAGICQ_NETWORK_DISABLED");
    }
    await this.delegate.send(datagram);
  }
}

/**
 * Concrete Clara Lighting executor assembled from Universal Connections,
 * installation-specific MagicQ configuration, provider adapter and CREP.
 *
 * This class still owns no socket implementation. Network emission remains an
 * injected concern and should normally be wrapped in FeatureGatedMagicQUdpSender.
 */
export class ConfiguredMagicQLightingExecutor implements MagicQLightingExecutor {
  private readonly adapter: MagicQConnectorAdapter;

  constructor(
    connections: ConnectionRepository,
    configurations: MagicQConnectionConfigurationRepository,
    sender: UdpDatagramSender,
  ) {
    const resolver = new MagicQUniversalConnectionTargetResolver(
      connections,
      configurations,
    );
    this.adapter = new MagicQConnectorAdapter(resolver, sender);
  }

  setFixtureIntensity(
    request: MagicQFixtureIntensityRequest,
  ): Promise<MagicQFixtureIntensityResult> {
    return this.adapter.setFixtureIntensity(request);
  }
}
