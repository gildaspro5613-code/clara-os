const CREP_MAGIC = new Uint8Array([0x50, 0x45, 0x52, 0x43]); // "PERC" on the wire, per ChamSys CREP.
const CREP_HEADER_LENGTH = 10;

export const MAGICQ_CREP_DEFAULT_PORT = 6553;
export const MAGICQ_INTENSITY_CHANNEL_MIN = 1;
export const MAGICQ_INTENSITY_CHANNEL_MAX = 32769;
export const MAGICQ_INTENSITY_MIN = 0;
export const MAGICQ_INTENSITY_MAX = 100;

export interface CrepPacketOptions {
  readonly sequenceForward: number;
  readonly sequenceBackward?: number;
  readonly version?: number;
}

function assertByte(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(`${name} must be an integer between 0 and 255.`);
  }
}

function assertWord16(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(`${name} must be an integer between 0 and 65535.`);
  }
}

/**
 * Builds the documented ChamSys Remote Protocol command for setting one
 * intensity channel. The channel is the MagicQ DMX channel number documented
 * by ChamSys, not a Clara fixture id or MagicQ head number.
 */
export function buildMagicQIntensityCommand(
  channelNumber: number,
  levelPercent: number,
): string {
  if (
    !Number.isInteger(channelNumber) ||
    channelNumber < MAGICQ_INTENSITY_CHANNEL_MIN ||
    channelNumber > MAGICQ_INTENSITY_CHANNEL_MAX
  ) {
    throw new RangeError(
      `channelNumber must be an integer between ${MAGICQ_INTENSITY_CHANNEL_MIN} and ${MAGICQ_INTENSITY_CHANNEL_MAX}.`,
    );
  }

  if (
    !Number.isInteger(levelPercent) ||
    levelPercent < MAGICQ_INTENSITY_MIN ||
    levelPercent > MAGICQ_INTENSITY_MAX
  ) {
    throw new RangeError(
      `levelPercent must be an integer between ${MAGICQ_INTENSITY_MIN} and ${MAGICQ_INTENSITY_MAX}.`,
    );
  }

  return `${channelNumber},${levelPercent}I`;
}

/**
 * Encodes one ChamSys CREP packet exactly at the protocol boundary.
 *
 * Wire format:
 *   P E R C | version:u16 BE | seq_fwd:u8 | seq_bkwd:u8 | length:u16 BE | data
 *
 * The data field is raw bytes and its length excludes the ten-byte CREP header.
 */
export function encodeCrepPacket(
  data: Uint8Array,
  options: CrepPacketOptions,
): Uint8Array {
  const version = options.version ?? 0;
  const sequenceBackward = options.sequenceBackward ?? 0;

  assertWord16("version", version);
  assertByte("sequenceForward", options.sequenceForward);
  assertByte("sequenceBackward", sequenceBackward);

  if (data.byteLength > 0xffff) {
    throw new RangeError("CREP data payload must not exceed 65535 bytes.");
  }

  const packet = new Uint8Array(CREP_HEADER_LENGTH + data.byteLength);
  packet.set(CREP_MAGIC, 0);

  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
  view.setUint16(4, version, false);
  view.setUint8(6, options.sequenceForward);
  view.setUint8(7, sequenceBackward);
  view.setUint16(8, data.byteLength, false);
  packet.set(data, CREP_HEADER_LENGTH);

  return packet;
}

export function encodeMagicQIntensityCrepPacket(
  channelNumber: number,
  levelPercent: number,
  options: CrepPacketOptions,
): Uint8Array {
  const command = buildMagicQIntensityCommand(channelNumber, levelPercent);
  return encodeCrepPacket(new TextEncoder().encode(command), options);
}
