import type {CommercialCommunicationDraft} from './commercial-communication-draft';
/** V1 is unchanged (including migration 014). Mail responses reuse its subject,
 * body, revision and recipient vocabulary; V2 explicitly freezes its envelope. */
export interface MailboxCommunicationDraft extends Pick<CommercialCommunicationDraft,'subject'|'body'|'revision'|'updatedAt'> {
 schema:'clara.mailbox-communication-draft.v2';connectionId:string;messageId:string;
 sender:{email:string};recipients:string[];attachmentIds:string[];
}
export interface StoredMailboxDraft extends Pick<MailboxCommunicationDraft,'schema'|'connectionId'|'messageId'|'sender'|'revision'|'updatedAt'> {encryptedDraft:string}
