import assert from "node:assert/strict";
import test from "node:test";

import {
  MAGICQ_CREP_DEFAULT_PORT,
  MagicQCrepTransport,
  buildMagicQIntensityCommand,
  encodeMagicQIntensityCrepPacket,
  type UdpDatagram,
  type UdpDatagramSender,
} from "@/lib/connectors/internal/chamsys/magicq";

class MemoryUdpSender implements UdpDatagramSender {
  public readonly datagrams: UdpDatagram[] = [];

  async send(datagram: UdpDatagram): Promise<void> {
    this.datagrams.push(datagram);
  }
}

test("builds the documented MagicQ intensity command", () => {
  assert.equal(buildMagicQIntensityCommand(1, 50), "1,50I");
  assert.equal(buildMagicQIntensityCommand(32769, 100), "32769,100I");
});

test("rejects invalid channel and intensity values", () => {
  assert.throws(() => buildMagicQIntensityCommand(0, 50), RangeError);
  assert.throws(() => buildMagicQIntensityCommand(32770, 50), RangeError);
  assert.throws(() => buildMagicQIntensityCommand(1.5, 50), RangeError);
  assert.throws(() => buildMagicQIntensityCommand(1, -1), RangeError);
  assert.throws(() => buildMagicQIntensityCommand(1, 101), RangeError);
  assert.throws(() => buildMagicQIntensityCommand(1, Number.NaN), RangeError);
});

test("encodes the CREP header and payload deterministically", () => {
  const packet = encodeMagicQIntensityCrepPacket(1, 50, {
    sequenceForward: 7,
    sequenceBackward: 3,
  });

  assert.deepEqual(Array.from(packet), [
    0x50, 0x45, 0x52, 0x43, // PERC on the wire
    0x00, 0x00, // version 0, network byte order
    0x07, // forward sequence
    0x03, // backward sequence
    0x00, 0x05, // data length = 5 bytes
    0x31, 0x2c, 0x35, 0x30, 0x49, // ASCII: 1,50I
  ]);
});

test("uses an injected sender and does not provide a real socket implementation", async () => {
  const sender = new MemoryUdpSender();
  const transport = new MagicQCrepTransport(
    { host: "192.0.2.255" },
    sender,
  );

  await transport.setIntensity({ channelNumber: 12, levelPercent: 40 });

  assert.equal(sender.datagrams.length, 1);
  assert.equal(sender.datagrams[0]?.host, "192.0.2.255");
  assert.equal(sender.datagrams[0]?.port, MAGICQ_CREP_DEFAULT_PORT);
  assert.equal(
    new TextDecoder().decode(sender.datagrams[0]?.payload.slice(10)),
    "12,40I",
  );
});

test("increments the forward sequence only after a successful send", async () => {
  const sender = new MemoryUdpSender();
  const transport = new MagicQCrepTransport(
    { host: "192.0.2.255", port: 6553 },
    sender,
  );

  await transport.setIntensity({ channelNumber: 1, levelPercent: 10 });
  await transport.setIntensity({ channelNumber: 1, levelPercent: 20 });

  assert.equal(sender.datagrams[0]?.payload[6], 0);
  assert.equal(sender.datagrams[1]?.payload[6], 1);
});

test("includes the last acknowledged remote sequence in the next packet", async () => {
  const sender = new MemoryUdpSender();
  const transport = new MagicQCrepTransport(
    { host: "192.0.2.255" },
    sender,
  );

  transport.acknowledgeRemoteSequence(22);
  await transport.setIntensity({ channelNumber: 1, levelPercent: 25 });

  assert.equal(sender.datagrams[0]?.payload[7], 22);
});
