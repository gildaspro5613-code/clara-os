/**
 * ============================================
 * CLARA OS
 * Experience Module
 * --------------------------------------------
 * File : experience-engine.ts
 * Responsibility :
 * Coordinates Clara's professional
 * experience lifecycle.
 * ============================================
 */

import { Experience } from "./experience";
import { ExperienceRecord } from "./experience-record";
import { Timeline } from "./timeline";

/**
 * Experience engine.
 */
export class ExperienceEngine {

  /**
   * Records one professional experience.
   */
  public recordExperience(
    experience: Experience,
  ): ExperienceRecord {

    return {

      experience,

      summary: "",

      lessons: [],

      confidence: 0,

      promoteToKnowledge: false,

    };

  }

  /**
   * Extracts lessons from one experience.
   */
  public extractLessons(
    record: ExperienceRecord,
  ): ExperienceRecord {

    return record;

  }

  /**
   * Determines whether knowledge should
   * be promoted.
   */
  public promoteKnowledge(
    record: ExperienceRecord,
  ): ExperienceRecord {

    return record;

  }

  /**
   * Builds an experience timeline.
   */
  public buildTimeline(
    records: ExperienceRecord[],
  ): Timeline {

    return {

      id: crypto.randomUUID(),

      name: "Professional Timeline",

      records,

      createdAt: new Date(),

      updatedAt: new Date(),

    };

  }

}