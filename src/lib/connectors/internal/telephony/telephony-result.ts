/**
 * ============================================
 * CLARA OS
 * Telephony Connector
 * --------------------------------------------
 * File : telephony-result.ts
 * Responsibility :
 * Defines typed results returned by Clara OS
 * telephony operations.
 * ============================================
 */

export interface TelephonyResult {
  readonly success: boolean;

  /**
   * Executed operation.
   */
  readonly operation: string;

  /**
   * Destination number.
   */
  readonly toNumber?: string;

  /**
   * ElevenLabs conversation identifier.
   */
  readonly conversationId?: string;

  /**
   * Twilio call SID.
   */
  readonly callSid?: string;

  /**
   * Human-readable message.
   */
  readonly message?: string;

  /**
   * Error description.
   */
  readonly error?: string;

  /**
   * Completion timestamp.
   */
  readonly completedAt: Date;
}
