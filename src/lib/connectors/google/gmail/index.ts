/**
 * ============================================
 * CLARA OS
 * Google Gmail
 * --------------------------------------------
 * File : index.ts
 * Responsibility :
 * Public exports for Google Gmail
 * connector client and operations.
 * ============================================
 */

/**
 * Google Gmail connector public API exports.
 */
export { GmailClient } from "./gmail-client";
export type {
  ListMessagesOptions,
  ListMessagesResult,
} from "./list-messages";
export { listMessages } from "./list-messages";
export type {
  GetMessageOptions,
  MessageFormat,
} from "./get-message";
export { getMessage } from "./get-message";
export type {
  EmailRecipients,
  EmailMessageOptions,
  SendMessageOptions,
} from "./send-message";
export { sendMessage } from "./send-message";
export type { DraftMessageOptions } from "./draft-message";
export { draftMessage } from "./draft-message";
export type { DeleteMessageOptions } from "./delete-message";
export { deleteMessage } from "./delete-message";
export type { ModifyLabelsOptions } from "./modify-labels";
export { modifyLabels } from "./modify-labels";
export type { ListLabelsOptions } from "./list-labels";
export { listLabels } from "./list-labels";
