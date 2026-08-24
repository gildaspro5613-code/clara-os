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
import { getKnowledge } from "@/lib/knowledge";

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

    if (
      record.experience.category !== "success" ||
      record.lessons.length > 0
    ) {

      return record;

    }

    const lesson = {

      id: crypto.randomUUID(),

      title:
        `Successful execution: ${record.experience.title}`,

      description:
        record.summary ||
        record.experience.description,

      recommendation:
        "Reproduire cette méthode lorsque les mêmes conditions se présentent.",

      confidence:
        record.confidence,

      validatedAt:
        new Date(),

    };

    return {

      ...record,

      lessons: [
        lesson,
      ],

    };

  }

  /**
   * Determines whether knowledge should
   * be promoted.
   */
  public promoteKnowledge(
    record: ExperienceRecord,
  ): ExperienceRecord {

    const shouldPromote =
      record.experience.category === "success" &&
      record.lessons.length > 0 &&
      record.confidence >= 0.8;

    if (!shouldPromote) {

      return {

        ...record,

        promoteToKnowledge: false,

      };

    }

    const knowledge =
      getKnowledge();

    for (const lesson of record.lessons) {

      knowledge.addLearnedKnowledge({

        id:
          crypto.randomUUID(),

        title:
          lesson.title,

        description:
          lesson.description,

        recommendation:
          lesson.recommendation,

        confidence:
          lesson.confidence,

        sourceExperienceId:
          record.experience.id,

        createdAt:
          lesson.validatedAt,

      });

    }

    return {

      ...record,

      promoteToKnowledge: true,

    };

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