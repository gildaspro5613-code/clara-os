import type { UdpDatagram, UdpDatagramSender } from "./transport";

function validateDatagram(datagram: UdpDatagram): void {
  if (!datagram.host.trim()) {
    throw new TypeError("MagicQ UDP host must be a non-empty string.");
  }
  if (!Number.isInteger(datagram.port) || datagram.port < 1 || datagram.port > 65535) {
    throw new RangeError("MagicQ UDP port must be between 1 and 65535.");
  }
  if (!(datagram.payload instanceof Uint8Array) || datagram.payload.length === 0) {
    throw new TypeError("MagicQ UDP payload must be a non-empty Uint8Array.");
  }
}

/**
 * Real Node.js UDP sender for the MagicQ CREP transport.
 *
 * This class can emit network traffic and must only be injected behind
 * FeatureGatedMagicQUdpSender from the server-side composition root. Merely
 * importing or constructing it opens no socket; the socket is created only
 * inside send().
 */
export class NodeMagicQUdpDatagramSender implements UdpDatagramSender {
  async send(datagram: UdpDatagram): Promise<void> {
    validateDatagram(datagram);

    const { createSocket } = await import("node:dgram");

    await new Promise<void>((resolve, reject) => {
      const socket = createSocket("udp4");
      let settled = false;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        socket.close();
        if (error) reject(error);
        else resolve();
      };

      socket.once("error", finish);
      socket.bind(0, () => {
        try {
          socket.setBroadcast(true);
          socket.send(
            datagram.payload,
            datagram.port,
            datagram.host,
            (error) => finish(error ?? undefined),
          );
        } catch (error) {
          finish(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });
  }
}

export const validateMagicQUdpDatagram = validateDatagram;
