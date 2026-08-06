/**
 * ============================================
 * CLARA OS
 * Google Gmail – List Messages
 * --------------------------------------------
 * File : list-messages.ts
 * Responsibility :
 * Lists Gmail messages for a user
 * using GmailClient.
 * ============================================
 */

import type { gmail_v1 } from "googleapis";

import { DEFAULT_GMAIL_USER_ID, GmailClient } from "./gmail-client";


/**
 * Options for listing Gmail messages.
 */
export interface ListMessagesOptions {

  /**
   * User identifier. Defaults to `me`.
   */
  userId?: string;

  /**
   * Maximum number of messages to return.
   * Must be between 1 and 500.
   */
  pageSize?: number;

  /**
   * Pagination token returned by a previous call.
   */
  pageToken?: string;

  /**
   * Message label identifiers used as a filter.
   */
  labelIds?: string[];

  /**
   * Gmail search query.
   */
  query?: string;

}

/**
 * Result returned by {@link listMessages}.
 */
export interface ListMessagesResult {

  /**
   * Matching Gmail message references.
   */
  messages: gmail_v1.Schema$Message[];

  /**
   * Token used to fetch the next page.
   */
  nextPageToken?: string;

  /**
   * Estimated total matching messages.
   */
  resultSizeEstimate: number;

}

/**
 * Lists Gmail messages for the authenticated user.
 *
 * Uses {@link GmailClient} to obtain an authenticated Gmail client and
 * delegates to the Gmail API v1 `users.messages.list` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - Optional filters and pagination controls.
 * @returns Message references and optional continuation token.
 * @throws {Error} When `pageSize` is outside of 1..500.
 */
export async function listMessages(
  options?: ListMessagesOptions,
): Promise<ListMessagesResult> {

  if (
    options?.pageSize !== undefined &&
    (options.pageSize < 1 || options.pageSize > 500)
  ) {

    throw new Error("listMessages: pageSize must be between 1 and 500.");

  }

  const gmail = new GmailClient().create();

  const params: gmail_v1.Params$Resource$Users$Messages$List = {

    userId: options?.userId ?? DEFAULT_GMAIL_USER_ID,

  };

  if (options?.pageSize !== undefined) {

    params.maxResults = options.pageSize;

  }

  if (options?.pageToken !== undefined) {

    params.pageToken = options.pageToken;

  }

  if (options?.labelIds !== undefined) {

    params.labelIds = options.labelIds;

  }

  if (options?.query !== undefined) {

    params.q = options.query;

  }

  const response = await gmail.users.messages.list(params);

  return {

    messages: response.data.messages ?? [],

    nextPageToken: response.data.nextPageToken ?? undefined,

    resultSizeEstimate: response.data.resultSizeEstimate ?? 0,

  };

}
