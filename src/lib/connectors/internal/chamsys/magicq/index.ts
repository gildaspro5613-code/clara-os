export {
  MAGICQ_CREP_DEFAULT_PORT,
  MAGICQ_INTENSITY_CHANNEL_MAX,
  MAGICQ_INTENSITY_CHANNEL_MIN,
  MAGICQ_INTENSITY_MAX,
  MAGICQ_INTENSITY_MIN,
  buildMagicQIntensityCommand,
  encodeCrepPacket,
  encodeMagicQIntensityCrepPacket,
  type CrepPacketOptions,
} from "./crep";

export {
  MAGICQ_CAPABILITIES,
  MagicQConnectorDefinition,
  type MagicQConnectorDefinitionShape,
} from "./definition";

export { MagicQConnectorAdapter } from "./adapter";

export type {
  MagicQFixtureIntensityRequest,
  MagicQFixtureIntensityResult,
  MagicQFixtureTargetResolver,
  ResolvedMagicQFixtureTarget,
} from "./types";

export {
  MagicQCrepTransport,
  type MagicQCrepTransportConfig,
  type MagicQIntensityOperation,
  type UdpDatagram,
  type UdpDatagramSender,
} from "./transport";
