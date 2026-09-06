import { MAGICQ_CAPABILITIES } from "./definition";
import { MagicQCrepTransport, type UdpDatagramSender } from "./transport";
import type {
  MagicQFixtureIntensityRequest,
  MagicQFixtureIntensityResult,
  MagicQFixtureTargetResolver,
} from "./types";

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return normalized;
}

function requireIntensityPercent(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError("intensityPercent must be a finite number between 0 and 100.");
  }
}

/**
 * Provider-specific Clara Lighting adapter for ChamSys MagicQ.
 *
 * The adapter does not own workspace connection lookup and does not infer a
 * MagicQ channel from a Clara fixture id. Those installation-specific choices
 * are delegated to MagicQFixtureTargetResolver.
 *
 * UDP emission remains fully injectable. No real sender is created here.
 */
export class MagicQConnectorAdapter {
  constructor(
    private readonly targetResolver: MagicQFixtureTargetResolver,
    private readonly sender: UdpDatagramSender,
  ) {}

  async setFixtureIntensity(
    request: MagicQFixtureIntensityRequest,
  ): Promise<MagicQFixtureIntensityResult> {
    const workspaceId = requireNonEmpty(request.workspaceId, "workspaceId");
    const connectionId = requireNonEmpty(request.connectionId, "connectionId");
    const fixtureId = requireNonEmpty(request.fixtureId, "fixtureId");
    requireIntensityPercent(request.intensityPercent);

    const target = await this.targetResolver.resolve({
      workspaceId,
      connectionId,
      fixtureId,
    });

    const transport = new MagicQCrepTransport(
      {
        host: target.host,
        port: target.port,
      },
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
