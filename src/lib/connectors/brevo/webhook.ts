export const BREVO_WEBHOOK_EVENTS = [
  "sent", "delivered", "opened", "click", "hard_bounce", "soft_bounce",
  "blocked", "unsubscribed",
] as const;

export type BrevoWebhookEventName = (typeof BREVO_WEBHOOK_EVENTS)[number];

export interface BrevoWebhookEvent {
  provider: "brevo";
  event: BrevoWebhookEventName;
  occurredAt: Date;
  email?: string;
  messageId?: string;
  campaignId?: number;
  link?: string;
}

export function parseBrevoWebhook(payload: unknown): BrevoWebhookEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (typeof value.event !== "string" ||
      !BREVO_WEBHOOK_EVENTS.includes(value.event as BrevoWebhookEventName)) return null;
  const timestamp = typeof value.ts_event === "number" ? value.ts_event
    : typeof value.ts === "number" ? value.ts
    : undefined;
  if (timestamp === undefined) return null;
  const occurredAt = new Date(timestamp * 1_000);
  if (Number.isNaN(occurredAt.getTime())) return null;
  return {
    provider: "brevo",
    event: value.event as BrevoWebhookEventName,
    occurredAt,
    email: typeof value.email === "string" ? value.email : undefined,
    messageId: typeof value["message-id"] === "string" ? value["message-id"] : undefined,
    campaignId: typeof value.camp_id === "number" ? value.camp_id : undefined,
    link: typeof value.link === "string" ? value.link : undefined,
  };
}
