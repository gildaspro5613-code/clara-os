/**
 * ============================================
 * CLARA OS
 * Read Gmail Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface GmailEmailSummary {

  readonly id: string;

  readonly threadId: string;

  readonly from?: string;

  readonly to?: string;

  readonly subject?: string;

  readonly date?: string;

  readonly snippet?: string;

  readonly labelIds: string[];

}

export interface ReadGmailResult {

  readonly success: boolean;

  readonly emails: GmailEmailSummary[];

  readonly affectedEmails: number;

  readonly message: string;

  readonly completedAt: Date;

}
