/**
 * ============================================
 * CLARA OS
 * Google Gmail – List Labels
 * --------------------------------------------
 * File : list-labels.ts
 * Responsibility :
 * Lists available Gmail labels
 * using GmailClient.
 * ============================================
 */

import type { gmail_v1 } from "googleapis";

import { DEFAULT_GMAIL_USER_ID, GmailClient } from "./gmail-client";


/**
 * Options for listing Gmail labels.
 */
export interface ListLabelsOptions {

  /**
   * User identifier. Defaults to `me`.
   */
  userId?: string;

}

/**
 * Lists available Gmail labels.
 *
 * Uses {@link GmailClient} to obtain an authenticated Gmail client and
 * delegates to the Gmail API v1 `users.labels.list` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - Optional user identifier.
 * @returns Gmail labels visible to the user.
 */
export async function listLabels(
  options?: ListLabelsOptions,
): Promise<gmail_v1.Schema$Label[]> {

  const gmail = new GmailClient().create();

  const response = await gmail.users.labels.list({

    userId: options?.userId ?? DEFAULT_GMAIL_USER_ID,

  });

  return response.data.labels ?? [];

}
