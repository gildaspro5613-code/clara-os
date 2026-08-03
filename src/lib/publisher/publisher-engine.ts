/**
 * ============================================
 * CLARA OS
 * Publisher Module
 * --------------------------------------------
 * File : publisher-engine.ts
 * Responsibility :
 * Coordinates Clara's publication
 * lifecycle.
 * ============================================
 */

import { Publication } from "./publication";
import { Document } from "./document";
import { Output } from "./output";

export class PublisherEngine {

  /**
   * Generates a structured document.
   */
  public generateDocument(
    publication: Publication,
  ): Document {

    return {

      id: crypto.randomUUID(),

      publication,

      title: publication.title,

      content: "",

      version: "1.0.0",

      createdAt: new Date(),

    };

  }

  /**
   * Creates one publication output.
   */
  public createOutput(
    document: Document,
    format: Output["format"],
  ): Output {

    return {

      id: crypto.randomUUID(),

      document,

      format,

      location: "",

      generatedAt: new Date(),

    };

  }

}