/**
 * ============================================
 * CLARA OS
 * Knowledge Engine
 * --------------------------------------------
 * File : engine.ts
 * Responsibility :
 * Central access point for Clara's
 * knowledge modules.
 * ============================================
 */

import { KnowledgeModule } from "./module";
import { LearnedKnowledge } from "./learned-knowledge";

import { FOUNDATION_MODULE } from "./foundation/module";

/**
 * Knowledge Engine.
 */
export class KnowledgeEngine {

  /**
   * Loaded knowledge modules.
   */
  private readonly modules: KnowledgeModule[] = [
    FOUNDATION_MODULE,
  ];

  /**
   * Knowledge learned dynamically
   * from Clara's professional experience.
   */
  private readonly learnedKnowledge: LearnedKnowledge[] = [];

  /**
   * Returns every loaded module.
   */
  public getModules(): readonly KnowledgeModule[] {
    return this.modules;
  }

  /**
   * Returns one module.
   */
  public getModule(
    id: string,
  ): KnowledgeModule | undefined {

    return this.modules.find(
      (module) => module.id === id,
    );

  }

  /**
   * Returns all available knowledge.
   */
  public getKnowledge(): readonly KnowledgeModule[] {
    return this.modules;
  }

  /**
   * Adds knowledge learned from experience.
   */
  public addLearnedKnowledge(
    knowledge: LearnedKnowledge,
  ): void {

    this.learnedKnowledge.push(
      knowledge,
    );

  }

  /**
   * Returns dynamically learned knowledge.
   */
  public getLearnedKnowledge(): readonly LearnedKnowledge[] {
    return this.learnedKnowledge;
  }

}
    