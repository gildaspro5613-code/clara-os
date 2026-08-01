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

import { FOUNDATION_MODULE } from "./foundation/module";

/**
 * Knowledge Engine.
 */
export class KnowledgeEngine {

  /**
   * Returns every loaded knowledge module.
   */
  public getModules() {

    return [
      FOUNDATION_MODULE,
    ];

  }

  /**
   * Returns one knowledge module.
   */
  public getModule(
    id: string,
  ) {

    return this.getModules().find(
      (module) => module.id === id,
    );

  }

}