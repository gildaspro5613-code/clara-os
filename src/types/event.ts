/**
 * ============================================
 * CLARA OS
 * Types Module
 * --------------------------------------------
 * File : event.ts
 * Responsibility :
 * Represents an event handled by Clara.
 * ============================================
 */

/**
 * Types d'événements connus par Clara.
 */
export enum EventType {
  SYSTEM = "SYSTEM",
  USER_MESSAGE = "USER_MESSAGE",
  EMAIL_RECEIVED = "EMAIL_RECEIVED",
  PHONE_CALL = "PHONE_CALL",
  MEETING_CREATED = "MEETING_CREATED",
  TASK_COMPLETED = "TASK_COMPLETED",
  MISSION_RESUMED = "MISSION_RESUMED",
  DOCUMENT_RECEIVED = "DOCUMENT_RECEIVED",
}

/**
 * Représente un événement traité par Clara.
 */
export interface Event {
  /** Identifiant unique */
  id: string;

  /** Nature de l'événement */
  type: EventType;

  /** Origine de l'événement */
  source: string;

  /** Date de création */
  timestamp: Date;

  /** Données associées à l'événement */
  payload?: unknown;
}