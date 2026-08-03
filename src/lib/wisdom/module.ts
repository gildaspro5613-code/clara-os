/**
 * ============================================
 * CLARA OS
 * Wisdom Module
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Wisdom module.
 * ============================================
 */

import { WisdomEngine } from "./wisdom-engine";

export const WISDOM_MODULE = {

  id: "wisdom",

  name: "Wisdom",

  version: "1.0.0",

  description:
    "Transforms knowledge and experience into professional judgment.",

  engine: new WisdomEngine(),

} as const;