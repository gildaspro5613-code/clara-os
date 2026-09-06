import {
  SOUND_CONNECTOR_FOUNDATIONS,
  type SoundConsoleProvider,
} from "./console-foundations";

export const SoundOnboardingState = {
  WAITING_FOR_CONFIGURATION: "WAITING_FOR_CONFIGURATION",
  READY_FOR_CONNECTION_TEST: "READY_FOR_CONNECTION_TEST",
  PROTOCOL_VALIDATION_REQUIRED: "PROTOCOL_VALIDATION_REQUIRED",
} as const;

export type SoundOnboardingState =
  (typeof SoundOnboardingState)[keyof typeof SoundOnboardingState];

export type SoundOnboardingPlan = {
  provider: SoundConsoleProvider;
  state: SoundOnboardingState;
  hostRequired: true;
  portRequired: boolean;
  defaultPort?: number;
  networkTouched: false;
  writeCapabilitiesEnabled: false;
  physicalCertificationGranted: false;
  guidance: readonly string[];
};

export function planSoundConsoleOnboarding(provider: SoundConsoleProvider): SoundOnboardingPlan {
  const foundation = SOUND_CONNECTOR_FOUNDATIONS[provider];
  const protocolValidated = foundation.transport !== "NETWORK_UNCERTIFIED";

  return {
    provider,
    state: protocolValidated
      ? SoundOnboardingState.WAITING_FOR_CONFIGURATION
      : SoundOnboardingState.PROTOCOL_VALIDATION_REQUIRED,
    hostRequired: true,
    portRequired: foundation.defaultPort === undefined,
    defaultPort: foundation.defaultPort,
    networkTouched: false,
    writeCapabilitiesEnabled: false,
    physicalCertificationGranted: false,
    guidance: foundation.notes,
  };
}

export function planConfiguredSoundConsoleOnboarding(
  provider: SoundConsoleProvider,
  host: string,
  port?: number,
): SoundOnboardingPlan {
  const plan = planSoundConsoleOnboarding(provider);
  if (plan.state === SoundOnboardingState.PROTOCOL_VALIDATION_REQUIRED) return plan;

  const normalizedHost = host.trim();
  const resolvedPort = port ?? plan.defaultPort;
  if (!normalizedHost || !resolvedPort || !Number.isInteger(resolvedPort) || resolvedPort < 1 || resolvedPort > 65535) {
    return plan;
  }

  return {
    ...plan,
    state: SoundOnboardingState.READY_FOR_CONNECTION_TEST,
  };
}
