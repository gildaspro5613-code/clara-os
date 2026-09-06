import { MAGICQ_CAPABILITIES } from "./definition";
import {
  MagicQCrepTransport,
  type UdpDatagramSender,
} from "./transport";
import type {
  MagicQFixtureIntensityRequest,
  MagicQFixtureIntensityResult,
  MagicQFixtureTargetResolver,
} from "./types";

function assertNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${field} must be a non-empty string.`);
  return normalized;
}

function assertIntensityPercent(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError("intensityPercent must be a finite number between 0 and 100.");
  }
}

/**
 * ChamSys MagicQ provider adapter for Clara Lighting.
 *
 * This adapter deliberately does not resolve workspace connection data by
 * itself. The resolver boundary owns the mapping from Clara fixture id to an
 * installation-specific MagicQ DMX channel and network destination.
 *
 * Network access remains injectable through UdpDatagramSender. Supplying the
 * in-memory sender used by tests keeps this path fully offline.
 */
export class MagicQConnectorAdapter {
  constructor(
    private readonly targets: MagicQFixtureTargetResolver,
    private readonly sender: UdpDatagramSender,
  ) {}

  async setFixtureIntensity(
    request: MagicQFixtureIntensityRequest,
  ): Promise<MagicQFixtureIntensityResult> {
    const workspaceId = assertNonEmpty(request.workspaceId, "workspaceId");
    const connectionId = assertNonEmpty(request.connectionId, "connectionId");
    const fixtureId = assertNonEmpty(request.fixtureId, "fixtureId");
    assertIntensityPercent(request.intensityPercent);

    const target = await this.targets.resolve({
      workspaceId,
      connectionId,
      fixtureId,
    });

    const transport = new MagicQCrepTransport(
      { host: target.host, port: target.port },
      this.sender,
    );

    await transport.setIntensity({
      channelNumber: target.channelNumber,
      levelPercent: request.intensityPercent,
    });

    return {
      provider: "chamsys",
      connectorId: "chamsys.magicq",
      capability: MAGICQ_CAPABILITIES.FIXTURE_INTENSITY_SET,
      fixtureId,
      requestedIntensityPercent: request.intensityPercent,
      dispatched: true,
    };
  }
}
