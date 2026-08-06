/**
 * ============================================
 * CLARA OS
 * Google Gmail – Draft Message
 * --------------------------------------------
 * File : draft-message.ts
 * Responsibility :
 * Builds and creates Gmail drafts
 * using GmailClient.
 * ============================================
 */

import type { gmail_v1 } from "googleapis";

import { DEFAULT_GMAIL_USER_ID, GmailClient } from "./gmail-client";
import {
  buildRawMimeMessage,
  type EmailMessageOptions,
} from "./send-message";


/**
 * Options for creating a Gmail draft.
 */
export interface DraftMessageOptions extends EmailMessageOptions {

  /**
   * User identifier. Defaults to `me`.
   */
  userId?: string;

}

/**
 * Creates a Gmail draft from structured message content.
 *
 * Uses {@link GmailClient} to obtain an authenticated Gmail client,
 * builds a MIME payload through {@link buildRawMimeMessage} and delegates
 * draft creation to the Gmail API v1 `users.drafts.create` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - User identifier and message payload.
 * @returns The created Gmail draft.
 */
export async function draftMessage(
  options: DraftMessageOptions,
): Promise<gmail_v1.Schema$Draft> {

  const gmail = new GmailClient().create();

  const response = await gmail.users.drafts.create({

    userId: options.userId ?? DEFAULT_GMAIL_USER_ID,

    requestBody: {

      message: {

        raw: buildRawMimeMessage(options),

      },

    },

  });

  return response.data;

}
