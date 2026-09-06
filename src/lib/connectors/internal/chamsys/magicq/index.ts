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
  MagicQCrepTransport,
  type MagicQCrepTransportConfig,
  type MagicQIntensityOperation,
  type UdpDatagram,
  type UdpDatagramSender,
} from "./transport";
