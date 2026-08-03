/**
 * ============================================
 * CLARA OS
 * Academy Module
 * --------------------------------------------
 * File : trainer.ts
 * Responsibility :
 * Represents one trainer responsible
 * for Clara's professional development.
 * ============================================
 */

/**
 * Trainer type.
 */
export enum TrainerType {

  HUMAN = "HUMAN",

  AI = "AI",

  ORGANIZATION = "ORGANIZATION",

  EXPERIENCE = "EXPERIENCE",

}

/**
 * One Clara trainer.
 */
export interface Trainer {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Trainer name.
   */
  name: string;

  /**
   * Trainer type.
   */
  type: TrainerType;

  /**
   * Main expertise.
   */
  expertise: string;

  /**
   * Short description.
   */
  description?: string;

  /**
   * Whether this trainer
   * is currently active.
   */
  active: boolean;

  /**
   * Date of first contribution.
   */
  createdAt: Date;

  /**
   * Date of latest contribution.
   */
  updatedAt: Date;

}