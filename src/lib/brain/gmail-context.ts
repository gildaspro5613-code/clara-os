/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : gmail-context.ts
 * Responsibility :
 * Provides Gmail context to Clara's Brain
 * through the configured Gmail connector.
 * ============================================
 */

import { getMessage } from "@/lib/connectors/google/gmail/get-message";
import { listMessages } from "@/lib/connectors/google/gmail/list-messages";

export interface BrainGmailMessage {
  id: string;
  threadId?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  snippet?: string;
  labelIds?: string[];
}

export interface BrainGmailContext {
  available: boolean;
  messages: BrainGmailMessage[];
  source: "google-gmail";
  error?: string;
}

function getHeader(
  headers: Array<{ name?: string | null; value?: string | null }>,
  name: string,
): string | undefined {
  return headers.find(
    (header) => header.name?.toLowerCase() === name.toLowerCase(),
  )?.value ?? undefined;
}

export function summarizeGmailContext(
  context: BrainGmailContext,
): string {
  const lines = [
    `Gmail disponible : ${context.available ? "oui" : "non"}.`,
  ];

  if (context.error) {
    lines.push(`Erreur : ${context.error}`);
  }

  if (context.messages.length === 0) {
    lines.push("Aucun email trouvé.");
    return lines.join("\n");
  }

  lines.push("Emails :");

  for (const message of context.messages) {
    lines.push(
      [
        `- ${message.subject ?? "Sans objet"}`,
        message.from ? `de: ${message.from}` : "",
        message.to ? `à: ${message.to}` : "",
        message.date ? `date: ${message.date}` : "",
        message.snippet ? `aperçu: ${message.snippet}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  return lines.join("\n");
}

export async function buildGmailContext(
  event: {
    type: string;
    payload?: unknown;
  },
  now: Date,
): Promise<BrainGmailContext> {

  try {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const after = Math.floor(startOfDay.getTime() / 1000);

    const result = await listMessages({
      userId: "me",
      pageSize: 20,
      query: `after:${after}`,
    });

    const messages: BrainGmailMessage[] = [];

    for (const reference of result.messages) {
      if (!reference.id) {
        continue;
      }

      const fullMessage = await getMessage({
        userId: "me",
        messageId: reference.id,
        format: "metadata",
        metadataHeaders: [
          "Subject",
          "From",
          "To",
          "Date",
        ],
      });

      const headers = fullMessage.payload?.headers ?? [];

      messages.push({
        id: fullMessage.id ?? reference.id,
        threadId: fullMessage.threadId ?? undefined,
        subject: getHeader(headers, "Subject"),
        from: getHeader(headers, "From"),
        to: getHeader(headers, "To"),
        date: getHeader(headers, "Date"),
        snippet: fullMessage.snippet ?? undefined,
        labelIds: fullMessage.labelIds ?? undefined,
      });
    }

    return {
      available: true,
      source: "google-gmail",
      messages,
    };
  } catch (error) {
    return {
      available: false,
      source: "google-gmail",
      messages: [],
      error:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les mails.",
    };
  }
}
