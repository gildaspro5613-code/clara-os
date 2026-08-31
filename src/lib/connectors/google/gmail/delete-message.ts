/**
 * ============================================
 * CLARA OS
 * Google Gmail – Delete Message
 * --------------------------------------------
 * File : delete-message.ts
 * Responsibility :
 * Deletes one Gmail message by id
 * using GmailClient.
 * ============================================
 */

import { DEFAULT_GMAIL_USER_ID, GmailClient } from "./gmail-client";


/**
 * Options for deleting one Gmail message.
 */
export interface DeleteMessageOptions {

  /**
   * User identifier. Defaults to `me`.
   */
  userId?: string;

  /**
   * Message identifier to delete.
   */
  messageId: string;

}

/**
 * Deletes one Gmail message.
 *
 * Uses {@link GmailClient} to obtain an authenticated Gmail client and
 * delegates to the Gmail API v1 `users.messages.delete` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - User and message identifiers.
 * @returns Resolves when the message has been deleted.
 * @throws {Error} When `messageId` is empty or blank.
 */
export async function deleteMessage(
  options: DeleteMessageOptions,
): Promise<void> {

  if (!options.messageId.trim()) {

    throw new Error("deleteMessage: messageId must not be empty.");

  }

  const gmail = await new GmailClient().create();

  await gmail.users.messages.delete({

    userId: options.userId ?? DEFAULT_GMAIL_USER_ID,

    id: options.messageId,

  });

}
