export const SOUND_CONSOLE_PROVIDERS = {
  X32_M32: "sound-x32-m32",
  YAMAHA_DM3: "sound-yamaha-dm3",
  YAMAHA_CL_QL: "sound-yamaha-cl-ql",
  ALLEN_HEATH_SQ: "sound-allen-heath-sq",
  ALLEN_HEATH_DLIVE: "sound-allen-heath-dlive",
} as const;

export type SoundConsoleProvider =
  (typeof SOUND_CONSOLE_PROVIDERS)[keyof typeof SOUND_CONSOLE_PROVIDERS];

export const SoundSafetyClass = {
  READ_ONLY: "READ_ONLY",
  CONTROLLED_WRITE: "CONTROLLED_WRITE",
  HIGH_RISK_WRITE: "HIGH_RISK_WRITE",
} as const;

export type SoundSafetyClass =
  (typeof SoundSafetyClass)[keyof typeof SoundSafetyClass];

export const SOUND_CAPABILITIES = {
  CHANNEL_STATE_READ: "sound.channel.state.read",
  CHANNEL_LEVEL_SET: "sound.channel.level.set",
  CHANNEL_MUTE_SET: "sound.channel.mute.set",
  PREAMP_GAIN_SET: "sound.preamp.gain.set",
  PHANTOM_POWER_SET: "sound.preamp.phantom.set",
  ROUTING_SET: "sound.routing.set",
  SCENE_RECALL: "sound.scene.recall",
} as const;

export type SoundCapability =
  (typeof SOUND_CAPABILITIES)[keyof typeof SOUND_CAPABILITIES];

export const SOUND_CAPABILITY_SAFETY: Record<SoundCapability, SoundSafetyClass> = {
  [SOUND_CAPABILITIES.CHANNEL_STATE_READ]: SoundSafetyClass.READ_ONLY,
  [SOUND_CAPABILITIES.CHANNEL_LEVEL_SET]: SoundSafetyClass.CONTROLLED_WRITE,
  [SOUND_CAPABILITIES.CHANNEL_MUTE_SET]: SoundSafetyClass.CONTROLLED_WRITE,
  [SOUND_CAPABILITIES.PREAMP_GAIN_SET]: SoundSafetyClass.HIGH_RISK_WRITE,
  [SOUND_CAPABILITIES.PHANTOM_POWER_SET]: SoundSafetyClass.HIGH_RISK_WRITE,
  [SOUND_CAPABILITIES.ROUTING_SET]: SoundSafetyClass.HIGH_RISK_WRITE,
  [SOUND_CAPABILITIES.SCENE_RECALL]: SoundSafetyClass.HIGH_RISK_WRITE,
};

export type SoundConnectorFoundation = {
  provider: SoundConsoleProvider;
  family: string;
  transport: "OSC_UDP" | "MIDI_TCP" | "NETWORK_UNCERTIFIED";
  defaultPort?: number;
  readOnlyOnboarding: boolean;
  writeCapabilitiesEnabled: false;
  physicalCertificationGranted: false;
  notes: readonly string[];
};

/**
 * V1 registry is intentionally conservative. It records only protocol facts
 * that are safe to use as onboarding metadata. It does not open sockets,
 * send commands, or claim physical certification.
 */
export const SOUND_CONNECTOR_FOUNDATIONS: Record<SoundConsoleProvider, SoundConnectorFoundation> = {
  [SOUND_CONSOLE_PROVIDERS.X32_M32]: {
    provider: SOUND_CONSOLE_PROVIDERS.X32_M32,
    family: "Behringer X32 / Midas M32",
    transport: "OSC_UDP",
    readOnlyOnboarding: true,
    writeCapabilitiesEnabled: false,
    physicalCertificationGranted: false,
    notes: ["OSC network family", "Mutation remains disabled until command-level validation"],
  },
  [SOUND_CONSOLE_PROVIDERS.YAMAHA_DM3]: {
    provider: SOUND_CONSOLE_PROVIDERS.YAMAHA_DM3,
    family: "Yamaha DM3",
    transport: "OSC_UDP",
    defaultPort: 49900,
    readOnlyOnboarding: true,
    writeCapabilitiesEnabled: false,
    physicalCertificationGranted: false,
    notes: ["DM3 OSC family", "Do not reuse this protocol assumption for CL/QL"],
  },
  [SOUND_CONSOLE_PROVIDERS.YAMAHA_CL_QL]: {
    provider: SOUND_CONSOLE_PROVIDERS.YAMAHA_CL_QL,
    family: "Yamaha CL / QL",
    transport: "NETWORK_UNCERTIFIED",
    readOnlyOnboarding: false,
    writeCapabilitiesEnabled: false,
    physicalCertificationGranted: false,
    notes: ["Protocol intentionally uncertified in V1", "No transport or mutation enabled"],
  },
  [SOUND_CONSOLE_PROVIDERS.ALLEN_HEATH_SQ]: {
    provider: SOUND_CONSOLE_PROVIDERS.ALLEN_HEATH_SQ,
    family: "Allen & Heath SQ",
    transport: "MIDI_TCP",
    defaultPort: 51325,
    readOnlyOnboarding: true,
    writeCapabilitiesEnabled: false,
    physicalCertificationGranted: false,
    notes: ["MIDI over TCP/IP family", "Mutation remains disabled until command-level validation"],
  },
  [SOUND_CONSOLE_PROVIDERS.ALLEN_HEATH_DLIVE]: {
    provider: SOUND_CONSOLE_PROVIDERS.ALLEN_HEATH_DLIVE,
    family: "Allen & Heath dLive",
    transport: "MIDI_TCP",
    readOnlyOnboarding: true,
    writeCapabilitiesEnabled: false,
    physicalCertificationGranted: false,
    notes: ["MIDI over TCP/IP family", "Port and security mode must be explicit before transport"],
  },
};

export function getSoundCapabilitySafety(capability: SoundCapability): SoundSafetyClass {
  return SOUND_CAPABILITY_SAFETY[capability];
}
