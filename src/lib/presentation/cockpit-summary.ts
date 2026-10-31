import type { ClaraSession } from "@/lib/core/session";

export interface CockpitEmailSummary {
  id: string;
  sender?: string;
  subject?: string;
  important: boolean;
  href: string;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

/** Bounded original metadata only. Never accept email bodies or snippets. */
export function originalLabel(value: unknown, limit = 120): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/[\r\n\t]+/g, " ").trim();
  return text ? text.slice(0, limit) + (text.length > limit ? "…" : "") : undefined;
}

/** Presentation projection: no ranking, persistence, translation or Brain decisions. */
export function cockpitEmails(session: ClaraSession): CockpitEmailSummary[] {
  const source = session.sources.find(item => item.source === "google-gmail" && item.available);
  const data = object(source?.data);
  const seen = new Set<string>();
  if (!Array.isArray(data.messages)) return [];
  return data.messages.flatMap(value => {
    const message = object(value);
    const id = typeof message.id === "string" ? message.id : "";
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(id) || seen.has(id)) return [];
    seen.add(id);
    return [{ id, sender: originalLabel(message.from), subject: originalLabel(message.subject),
      important: Array.isArray(message.labelIds) && message.labelIds.includes("IMPORTANT"),
      href: `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(id)}` }];
  }).slice(0, 5);
}

export function cockpitConversationSummary(session: ClaraSession) {
  return {
    messages: session.conversation.length,
    partial: session.conversation.filter(message => message.generation && message.generation.status !== "completed").length,
  };
}
