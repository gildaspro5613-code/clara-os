import { createHmac, timingSafeEqual } from "node:crypto";

export interface StripeWebhookEvent<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly created?: number;
  readonly data: { readonly object: T };
}

function parseSignatureHeader(header: string): { timestamp: string; signatures: string[] } {
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "t" && value) timestamp = value;
    if (key === "v1" && value) signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) throw new Error("Invalid Stripe signature header.");
  return { timestamp, signatures };
}

export function verifyStripeWebhook<T = unknown>(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): StripeWebhookEvent<T> {
  if (!webhookSecret.trim()) throw new Error("Stripe webhook secret is required.");
  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(nowSeconds - timestampNumber) > toleranceSeconds) {
    throw new Error("Stripe webhook signature timestamp is outside tolerance.");
  }

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const signatureBuffer = Buffer.from(signature, "hex");
    return signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer);
  });
  if (!valid) throw new Error("Invalid Stripe webhook signature.");

  return JSON.parse(rawBody) as StripeWebhookEvent<T>;
}
