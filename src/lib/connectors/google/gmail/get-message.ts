/**
 * ============================================
 * CLARA OS
 * Google Gmail – Get Message
 * --------------------------------------------
 * File : get-message.ts
 * Responsibility :
 * Retrieves one Gmail message by id
 * using GmailClient.
 * ============================================
 */

import type { gmail_v1 } from "googleapis";

import { DEFAULT_GMAIL_USER_ID, GmailClient } from "./gmail-client";


/**
 * Supported Gmail message retrieval formats.
 */
export type MessageFormat = "full" | "metadata" | "minimal" | "raw";

/**
 * Options for retrieving one Gmail message.
 */
export interface GetMessageOptions {

  /**
   * User identifier. Defaults to `me`.
   */
  userId?: string;

  /**
   * Message identifier to retrieve.
   */
  messageId: string;

  /**
   * Retrieval format. Defaults to `full`.
   */
  format?: MessageFormat;

  /**
   * Metadata headers to include when format is `metadata`.
   */
  metadataHeaders?: string[];

}

/**
 * Retrieves one Gmail message.
 *
 * Uses {@link GmailClient} to obtain an authenticated Gmail client and
 * delegates to the Gmail API v1 `users.messages.get` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - Message identifier and retrieval options.
 * @returns The Gmail message payload.
 * @throws {Error} When `messageId` is empty or blank.
 */
export async function getMessage(
  options: GetMessageOptions,
): Promise<gmail_v1.Schema$Message> {

  if (!options.messageId.trim()) {

    throw new Error("getMessage: messageId must not be empty.");

  }

  const gmail = await new GmailClient().create();

  const response = await gmail.users.messages.get({

    userId: options.userId ?? DEFAULT_GMAIL_USER_ID,

    id: options.messageId,

    format: options.format ?? "full",

    metadataHeaders: options.metadataHeaders,

  });

  return response.data;

}
