/**
 * ============================================
 * CLARA OS
 * Google Gmail – Modify Labels
 * --------------------------------------------
 * File : modify-labels.ts
 * Responsibility :
 * Adds and removes labels on one
 * Gmail message using GmailClient.
 * ============================================
 */

import type { gmail_v1 } from "googleapis";

import { DEFAULT_GMAIL_USER_ID, GmailClient } from "./gmail-client";


/**
 * Options for modifying labels on a Gmail message.
 */
export interface ModifyLabelsOptions {

  /**
   * User identifier. Defaults to `me`.
   */
  userId?: string;

  /**
   * Message identifier on which labels are modified.
   */
  messageId: string;

  /**
   * Labels to add.
   */
  addLabelIds?: string[];

  /**
   * Labels to remove.
   */
  removeLabelIds?: string[];

}

/**
 * Adds and removes labels from a Gmail message.
 *
 * Uses {@link GmailClient} to obtain an authenticated Gmail client and
 * delegates to the Gmail API v1 `users.messages.modify` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - User id, message id and label modifications.
 * @returns The updated Gmail message.
 * @throws {Error} When `messageId` is empty or blank.
 * @throws {Error} When no label ids are provided for addition or removal.
 */
export async function modifyLabels(
  options: ModifyLabelsOptions,
): Promise<gmail_v1.Schema$Message> {

  if (!options.messageId.trim()) {

    throw new Error("modifyLabels: messageId must not be empty.");

  }

  if (
    (!options.addLabelIds || options.addLabelIds.length === 0) &&
    (!options.removeLabelIds || options.removeLabelIds.length === 0)
  ) {

    throw new Error(
      "modifyLabels: at least one label id must be provided in addLabelIds or removeLabelIds.",
    );

  }

  const gmail = await new GmailClient().create();

  const response = await gmail.users.messages.modify({

    userId: options.userId ?? DEFAULT_GMAIL_USER_ID,

    id: options.messageId,

    requestBody: {

      addLabelIds: options.addLabelIds,

      removeLabelIds: options.removeLabelIds,

    },

  });

  return response.data;

}
