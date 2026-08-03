/**
 * ============================================
 * CLARA OS
 * Connectors Module
 * --------------------------------------------
 * File : connector-event.ts
 * Responsibility :
 * Defines an event received by
 * a connector.
 * ============================================
 */

/**
 * Connector event.
 */
export interface ConnectorEvent {

  /**
   * Event identifier.
   */
  id: string;

  /**
   * Requested capability.
   */
  capability: string;

  /**
   * Event payload.
   */
  payload: unknown;

  /**
   * Event source.
   */
  source: string;

  /**
   * Reception date.
   */
  receivedAt: Date;

}