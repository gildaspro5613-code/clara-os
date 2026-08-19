/**
 * ============================================
 * CLARA OS
 * Telephony Connector
 * --------------------------------------------
 * File : telephony-context.ts
 * Responsibility :
 * Defines the execution context for Clara OS
 * telephony operations.
 * ============================================
 */

export type TelephonyOperation =
  | "outbound-call";

export interface TelephonyContext {
  /**
   * Operation to execute.
   */
  operation: TelephonyOperation;

  /**
   * Destination phone number in E.164 format.
   */
  toNumber: string;

  /**
   * Optional dynamic context passed to Clara
   * for the phone conversation.
   */
  dynamicVariables?: Record<string, string>;
}
