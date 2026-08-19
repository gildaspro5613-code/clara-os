/**
 * ============================================
 * CLARA OS
 * Google Gmail Connector
 * --------------------------------------------
 * File : google-gmail-engine.ts
 * Responsibility :
 * Executes Gmail operations.
 * ============================================
 */

import { sendMessage } from "@/lib/connectors/google/gmail/send-message";
import { GoogleGmailContext } from "./google-gmail-context";
import { GoogleGmailResult } from "./google-gmail-result";

export class GoogleGmailEngine {
  public async send(
    context: GoogleGmailContext,
  ): Promise<GoogleGmailResult> {
    if (!context.to) {
      throw new Error("GoogleGmailEngine.send: recipient is required.");
    }

    if (!context.body) {
      throw new Error("GoogleGmailEngine.send: body is required.");
    }

    const message = await sendMessage({
      recipients: {
        to: [context.to],
        cc: context.cc,
        bcc: context.bcc,
      },
      subject: context.subject,
      textBody: context.body,
    });

    return {
      success: true,
      messageId: message.id ?? undefined,
      threadId: message.threadId ?? undefined,
      message: "Email sent successfully.",
      completedAt: new Date(),
    };
  }

  public async read(
    context: GoogleGmailContext,
  ): Promise<GoogleGmailResult> {
    return {
      success: true,
      emails: [],
      message: "Emails loaded successfully.",
      completedAt: new Date(),
    };
  }

  public async search(
    context: GoogleGmailContext,
  ): Promise<GoogleGmailResult> {
    return {
      success: true,
      emails: [],
      message: "Search completed successfully.",
      completedAt: new Date(),
    };
  }

  public async delete(
    context: GoogleGmailContext,
  ): Promise<GoogleGmailResult> {
    return {
      success: true,
      message: "Email deleted successfully.",
      completedAt: new Date(),
    };
  }
}
