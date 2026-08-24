/**
 * ============================================
 * CLARA OS
 * Read Gmail Capability
 * --------------------------------------------
 * Workflow :
 * read workspace Gmail messages
 * and project them into a compact
 * cognitive representation.
 * ============================================
 */

import type { gmail_v1 } from "googleapis";

import {
  GoogleGmailEngine,
} from "@/lib/connectors/internal/google/gmail/google-gmail-engine";

import type { ReadGmailContext } from "./context";
import type {
  GmailEmailSummary,
  ReadGmailResult,
} from "./result";

export class ReadGmailWorkflow {

  private readonly gmail =
    new GoogleGmailEngine();

  public async execute(
    context: ReadGmailContext,
  ): Promise<ReadGmailResult> {

    try {

      const result =
        await this.gmail.read({

          query:
            context.query,

        });

      const emails =
        (result.emails ?? [])
          .map(
            (message) =>
              projectEmail(
                message as gmail_v1.Schema$Message,
              ),
          );

      return {

        success:
          result.success,

        emails,

        affectedEmails:
          emails.length,

        message:
          result.message ??
          "Emails loaded successfully.",

        completedAt:
          result.completedAt,

      };

    } catch (error) {

      return {

        success: false,

        emails: [],

        affectedEmails: 0,

        message:
          error instanceof Error
            ? error.message
            : "Unable to read workspace Gmail.",

        completedAt:
          new Date(),

      };

    }

  }

}

function projectEmail(
  message: gmail_v1.Schema$Message,
): GmailEmailSummary {

  const headers =
    message.payload?.headers ?? [];

  const getHeader =
    (name: string): string | undefined =>
      headers.find(
        header =>
          header.name?.toLowerCase() ===
          name.toLowerCase(),
      )?.value ?? undefined;

  return {

    id:
      message.id ?? "",

    threadId:
      message.threadId ?? "",

    from:
      getHeader("From"),

    to:
      getHeader("To"),

    subject:
      getHeader("Subject"),

    date:
      getHeader("Date"),

    snippet:
      message.snippet ?? "",

    labelIds:
      message.labelIds ?? [],

  };

}
