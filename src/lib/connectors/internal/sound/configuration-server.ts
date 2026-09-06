import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import {
  SOUND_CONNECTOR_FOUNDATIONS,
  type SoundConsoleProvider,
} from "./console-foundations";
import { DatabaseSoundConsoleConfigurationRepository } from "./configuration-repository";
import { SoundOnboardingState, planConfiguredSoundConsoleOnboarding } from "./onboarding";

export type SoundConsoleConfigurationInput = {
  workspaceId: string;
  provider: SoundConsoleProvider;
  host: string;
  port?: number;
};

export type SoundConsoleConfigurationResult = {
  connectionId: string;
  provider: SoundConsoleProvider;
  host: string;
  port: number;
  transport: string;
  status: typeof ConnectionStatus.CONFIGURED;
  onboardingState: typeof SoundOnboardingState.READY_FOR_CONNECTION_TEST;
  networkTouched: false;
  writeCapabilitiesEnabled: false;
  physicalCertificationGranted: false;
};

function normalizeHost(host: string): string {
  const value = host.trim();
  if (!value) throw new TypeError("Console host must be non-empty.");
  return value;
}

function normalizePort(provider: SoundConsoleProvider, port?: number): number {
  const foundation = SOUND_CONNECTOR_FOUNDATIONS[provider];
  if (foundation.transport === "NETWORK_UNCERTIFIED") {
    throw new TypeError("Sound console protocol must be validated before configuration can be activated.");
  }
  const resolved = port ?? foundation.defaultPort;
  if (resolved === undefined) {
    throw new TypeError("Console port must be explicitly configured for this provider.");
  }
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > 65535) {
    throw new RangeError("Console port must be an integer between 1 and 65535.");
  }
  return resolved;
}

export class ServerSoundConsoleConfigurationService {
  private readonly connections = new DatabaseConnectionRepository();
  private readonly configurations = new DatabaseSoundConsoleConfigurationRepository();

  async configure(input: SoundConsoleConfigurationInput): Promise<SoundConsoleConfigurationResult> {
    const foundation = SOUND_CONNECTOR_FOUNDATIONS[input.provider];
    const host = normalizeHost(input.host);
    const port = normalizePort(input.provider, input.port);
    const plan = planConfiguredSoundConsoleOnboarding(input.provider, host, port);
    if (plan.state !== SoundOnboardingState.READY_FOR_CONNECTION_TEST) {
      throw new TypeError("Sound console configuration is not ready for connection testing.");
    }

    const existing = await this.connections.findByWorkspaceAndProvider(input.workspaceId, input.provider);
    const now = new Date();
    const connection: Connection = existing
      ? { ...existing, status: ConnectionStatus.CONFIGURED, updatedAt: now }
      : {
          id: crypto.randomUUID(),
          workspaceId: input.workspaceId,
          provider: input.provider,
          status: ConnectionStatus.CONFIGURED,
          scopes: [],
          createdAt: now,
          updatedAt: now,
        };

    await this.connections.save(connection);
    await this.configurations.save({
      connectionId: connection.id,
      provider: input.provider,
      host,
      port,
      transport: foundation.transport,
    });

    return {
      connectionId: connection.id,
      provider: input.provider,
      host,
      port,
      transport: foundation.transport,
      status: ConnectionStatus.CONFIGURED,
      onboardingState: SoundOnboardingState.READY_FOR_CONNECTION_TEST,
      networkTouched: false,
      writeCapabilitiesEnabled: false,
      physicalCertificationGranted: false,
    };
  }
}
