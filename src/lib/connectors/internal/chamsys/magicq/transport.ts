import {
  MAGICQ_CREP_DEFAULT_PORT,
  encodeMagicQIntensityCrepPacket,
} from "./crep";

export interface UdpDatagram {
  readonly host: string;
  readonly port: number;
  readonly payload: Uint8Array;
}

/**
 * Injection boundary for UDP emission.
 *
 * No concrete network implementation is provided in this step. Production
 * network access must be added explicitly in a later hardware-test change.
 */
export interface UdpDatagramSender {
  send(datagram: UdpDatagram): Promise<void>;
}

export interface MagicQCrepTransportConfig {
  /**
   * CREP destination. ChamSys documents CREP in broadcast mode; therefore the
   * configured installation should normally provide the appropriate broadcast
   * address rather than hard-coding a console IP in connector code.
   */
  readonly host: string;
  readonly port?: number;
}

export interface MagicQIntensityOperation {
  /** MagicQ DMX channel number, not a Clara fixture id or MagicQ head number. */
  readonly channelNumber: number;
  readonly levelPercent: number;
}

function assertHost(host: string): void {
  if (typeof host !== "string" || host.trim().length === 0) {
    throw new TypeError("MagicQ CREP host must be a non-empty string.");
  }
}

function assertPort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("MagicQ CREP port must be an integer between 1 and 65535.");
  }
}

/**
 * CREP transport framing with an injected UDP boundary.
 *
 * This class contains no socket implementation and cannot reach a console on
 * its own. Tests can inject an in-memory sender; a real UDP sender belongs to a
 * later, explicitly approved hardware-test step.
 */
export class MagicQCrepTransport {
  private sequenceForward = 0;
  private sequenceBackward = 0;

  private readonly host: string;
  private readonly port: number;

  constructor(
    config: MagicQCrepTransportConfig,
    private readonly sender: UdpDatagramSender,
  ) {
    assertHost(config.host);
    const port = config.port ?? MAGICQ_CREP_DEFAULT_PORT;
    assertPort(port);

    this.host = config.host.trim();
    this.port = port;
  }

  /** Last CREP sequence received from the remote side, for future feedback. */
  public acknowledgeRemoteSequence(sequence: number): void {
    if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0xff) {
      throw new RangeError("CREP remote sequence must be an integer between 0 and 255.");
    }
    this.sequenceBackward = sequence;
  }

  public async setIntensity(operation: MagicQIntensityOperation): Promise<void> {
    const payload = encodeMagicQIntensityCrepPacket(
      operation.channelNumber,
      operation.levelPercent,
      {
        sequenceForward: this.sequenceForward,
        sequenceBackward: this.sequenceBackward,
      },
    );

    await this.sender.send({
      host: this.host,
      port: this.port,
      payload,
    });

    this.sequenceForward = (this.sequenceForward + 1) & 0xff;
  }
}
