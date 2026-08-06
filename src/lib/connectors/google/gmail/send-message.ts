/**
 * ============================================
 * CLARA OS
 * Google Gmail – Send Message
 * --------------------------------------------
 * File : send-message.ts
 * Responsibility :
 * Builds and sends MIME emails
 * through Gmail using GmailClient.
 * ============================================
 */

import type { gmail_v1 } from "googleapis";

import { GmailClient } from "./gmail-client";

const DEFAULT_USER_ID = "me";
const MIME_LINE_BREAK = "\r\n";

/**
 * Email recipients grouped by header.
 */
export interface EmailRecipients {

  /**
   * Primary recipient email addresses.
   */
  to: string[];

  /**
   * Carbon copy recipient email addresses.
   */
  cc?: string[];

  /**
   * Blind carbon copy recipient email addresses.
   */
  bcc?: string[];

}

/**
 * Email payload used to build a MIME message.
 */
export interface EmailMessageOptions {

  /**
   * Email recipients.
   */
  recipients: EmailRecipients;

  /**
   * Message subject.
   */
  subject?: string;

  /**
   * Plain text body.
   */
  textBody?: string;

  /**
   * HTML body.
   */
  htmlBody?: string;

}

/**
 * Options for sending a Gmail message.
 */
export interface SendMessageOptions extends EmailMessageOptions {

  /**
   * User identifier. Defaults to `me`.
   */
  userId?: string;

}

/**
 * Sends an email using Gmail.
 *
 * Uses {@link GmailClient} to obtain an authenticated Gmail client,
 * builds a MIME message payload and delegates sending to the Gmail API v1
 * `users.messages.send` endpoint. Errors thrown by the API are propagated.
 *
 * @param options - User identifier and message payload.
 * @returns The sent Gmail message metadata.
 */
export async function sendMessage(
  options: SendMessageOptions,
): Promise<gmail_v1.Schema$Message> {

  const gmail = new GmailClient().create();

  const response = await gmail.users.messages.send({

    userId: options.userId ?? DEFAULT_USER_ID,

    requestBody: {

      raw: buildRawMimeMessage(options),

    },

  });

  return response.data;

}

/**
 * Builds a base64url-encoded MIME message compatible with Gmail API.
 *
 * @param options - Structured email content.
 * @returns Base64url-encoded raw MIME payload.
 * @throws {Error} When recipients are missing or bodies are empty.
 */
export function buildRawMimeMessage(
  options: EmailMessageOptions,
): string {

  const to = validateAddresses(options.recipients.to, "to");
  const cc = validateAddresses(options.recipients.cc, "cc");
  const bcc = validateAddresses(options.recipients.bcc, "bcc");

  if (!options.textBody && !options.htmlBody) {

    throw new Error(
      "buildRawMimeMessage: at least one of textBody or htmlBody is required.",
    );

  }

  const safeSubject = sanitizeHeaderValue(options.subject ?? "");
  const headers = [

    `To: ${to.join(", ")}`,

    ...(cc.length > 0 ? [`Cc: ${cc.join(", ")}`] : []),

    ...(bcc.length > 0 ? [`Bcc: ${bcc.join(", ")}`] : []),

    `Subject: ${safeSubject}`,

    "MIME-Version: 1.0",

  ];

  const mimeMessage =
    options.textBody && options.htmlBody
      ? buildMultipartMessage(headers, options.textBody, options.htmlBody)
      : buildSinglePartMessage(headers, options.textBody, options.htmlBody);

  return toBase64Url(mimeMessage);

}

/**
 * Builds a plain text or HTML MIME message.
 */
function buildSinglePartMessage(
  headers: string[],
  textBody?: string,
  htmlBody?: string,
): string {

  if (textBody !== undefined) {

    return [

      ...headers,

      'Content-Type: text/plain; charset="UTF-8"',

      "Content-Transfer-Encoding: 7bit",

      "",

      textBody,

    ].join(MIME_LINE_BREAK);

  }

  return [

    ...headers,

    'Content-Type: text/html; charset="UTF-8"',

    "Content-Transfer-Encoding: 7bit",

    "",

    htmlBody ?? "",

  ].join(MIME_LINE_BREAK);

}

/**
 * Builds a multipart/alternative MIME message containing text and HTML parts.
 */
function buildMultipartMessage(
  headers: string[],
  textBody: string,
  htmlBody: string,
): string {

  const boundary = `claraos_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  return [

    ...headers,

    `Content-Type: multipart/alternative; boundary="${boundary}"`,

    "",

    `--${boundary}`,

    'Content-Type: text/plain; charset="UTF-8"',

    "Content-Transfer-Encoding: 7bit",

    "",

    textBody,

    `--${boundary}`,

    'Content-Type: text/html; charset="UTF-8"',

    "Content-Transfer-Encoding: 7bit",

    "",

    htmlBody,

    `--${boundary}--`,

    "",

  ].join(MIME_LINE_BREAK);

}

/**
 * Converts a MIME message string to Gmail-required base64url format.
 */
function toBase64Url(message: string): string {

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");

}

/**
 * Validates and sanitizes recipient addresses.
 */
function validateAddresses(
  addresses: string[] | undefined,
  headerName: "to" | "cc" | "bcc",
): string[] {

  if (!addresses || addresses.length === 0) {

    if (headerName === "to") {

      throw new Error("buildRawMimeMessage: at least one 'to' recipient is required.");

    }

    return [];

  }

  const cleanAddresses = addresses.map((address) => address.trim());

  if (cleanAddresses.some((address) => !address)) {

    throw new Error(`buildRawMimeMessage: '${headerName}' contains an empty address.`);

  }

  for (const address of cleanAddresses) {

    sanitizeHeaderValue(address);

  }

  return cleanAddresses;

}

/**
 * Protects headers against CRLF injection.
 */
function sanitizeHeaderValue(value: string): string {

  if (/\r|\n/u.test(value)) {

    throw new Error("buildRawMimeMessage: header values must not contain CRLF characters.");

  }

  return value;

}
