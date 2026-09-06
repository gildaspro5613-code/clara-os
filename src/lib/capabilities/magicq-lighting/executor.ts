import {
  MagicQConnectorAdapter,
  type MagicQFixtureIntensityRequest,
  type MagicQFixtureIntensityResult,
  type UdpDatagram,
  type UdpDatagramSender,
} from "@/lib/connectors/internal/chamsys/magicq";

export interface MagicQLightingExecutor {
  setFixtureIntensity(
    request: MagicQFixtureIntensityRequest,
  ): Promise<MagicQFixtureIntensityResult>;
}

/**
 * Safe production default used until the explicit hardware-test step enables
 * a real UDP sender. It fails closed before any network emission can occur.
 */
export class DisabledMagicQUdpSender implements UdpDatagramSender {
  async send(_datagram: UdpDatagram): Promise<void> {
    throw new Error("MAGICQ_NETWORK_DISABLED");
  }
}

export function createMagicQLightingExecutor(
  adapter: MagicQConnectorAdapter,
): MagicQLightingExecutor {
  return {
    setFixtureIntensity: request => adapter.setFixtureIntensity(request),
  };
}
