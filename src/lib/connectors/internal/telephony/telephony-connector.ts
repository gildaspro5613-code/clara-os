/**
 * ============================================
 * CLARA OS
 * Telephony Connector
 * --------------------------------------------
 * File : telephony-connector.ts
 * Responsibility :
 * Defines the Clara OS telephony connector
 * contract.
 * ============================================
 */

import type { TelephonyContext } from "./telephony-context";
import type { TelephonyResult } from "./telephony-result";

export interface TelephonyConnector {
  execute(
    context: TelephonyContext,
  ): Promise<TelephonyResult>;

  outboundCall(
    context: TelephonyContext,
  ): Promise<TelephonyResult>;
}
