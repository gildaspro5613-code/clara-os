/**
 * ============================================
 * CLARA OS
 * Microsoft Outlook – Send Message
 * --------------------------------------------
 * Responsibility :
 * Sends an email through Microsoft Graph.
 * ============================================
 */

import { MicrosoftGraphClient } from "../graph/graph-client";

export interface MicrosoftEmailRecipient {
  address: string;
  name?: string;
}

export interface SendMicrosoftMessageOptions {
  to: MicrosoftEmailRecipient[];
  cc?: MicrosoftEmailRecipient[];
  bcc?: MicrosoftEmailRecipient[];
  subject: string;
  body: string;
  bodyType?: "Text" | "HTML";
  saveToSentItems?: boolean;
}

function mapRecipients(recipients: MicrosoftEmailRecipient[] = []) {
  return recipients.map((recipient) => ({
    emailAddress: {
      address: recipient.address,
      ...(recipient.name ? { name: recipient.name } : {}),
    },
  }));
}

export async function sendMicrosoftMessage(
  options: SendMicrosoftMessageOptions,
): Promise<void> {
  if (options.to.length === 0) {
    throw new Error("sendMicrosoftMessage: at least one recipient is required.");
  }

  const client = new MicrosoftGraphClient();

  await client.request<void>("/me/sendMail", {
    method: "POST",
    body: JSON.stringify({
      message: {
        subject: options.subject,
        body: {
          contentType: options.bodyType ?? "Text",
          content: options.body,
        },
        toRecipients: mapRecipients(options.to),
        ccRecipients: mapRecipients(options.cc),
        bccRecipients: mapRecipients(options.bcc),
      },
      saveToSentItems: options.saveToSentItems ?? true,
    }),
  });
}
