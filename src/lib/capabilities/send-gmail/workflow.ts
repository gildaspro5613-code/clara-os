/**
 * ============================================
 * CLARA OS
 * Send Gmail Capability
 * --------------------------------------------
 * Workflow :
 * send email through workspace Gmail.
 * ============================================
 */

import {
  GoogleGmailEngine,
} from "@/lib/connectors/internal/google/gmail/google-gmail-engine";

import type { SendGmailContext } from "./context";
import type { SendGmailResult } from "./result";

export class SendGmailWorkflow {

  private readonly gmail =
    new GoogleGmailEngine();

  public async execute(
    context: SendGmailContext,
  ): Promise<SendGmailResult> {

    try {

      const result =
        await this.gmail.send({

          to:
            context.to,

          cc:
            context.cc,

          bcc:
            context.bcc,

          subject:
            context.subject,

          body:
            context.body,

        });

      return {

        success:
          result.success,

        messageId:
          result.messageId,

        threadId:
          result.threadId,

        message:
          result.message ??
          "Email sent successfully.",

        completedAt:
          result.completedAt,

      };

    } catch (error) {

      return {

        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to send Gmail message.",

        completedAt:
          new Date(),

      };

    }

  }

}
