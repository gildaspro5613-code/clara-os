/**
 * ============================================
 * CLARA OS
 * Connectors Module
 * --------------------------------------------
 * File : connector-result.ts
 * Responsibility :
 * Defines the result returned
 * by a connector.
 * ============================================
 */

/**
 * Connector result.
 */
export interface ConnectorResult {

  /**
   * Operation status.
   */
  success: boolean;

  /**
   * Executed capability.
   */
  capability: string;

  /**
   * Returned data.
   */
  data?: unknown;

  /**
   * Optional message.
   */
  message?: string;

  /**
   * Optional error.
   */
  error?: string;

  /**
   * Execution date.
   */
  completedAt: Date;

}