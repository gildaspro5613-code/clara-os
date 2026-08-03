/**
 * ============================================
 * CLARA OS
 * Knowledge Module
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Assistant
 * Knowledge Module.
 * ============================================
 */

import { ASSISTANT_IDENTITY } from "./identity";
import { ASSISTANT_PERSONALITY } from "./personality";
import { ASSISTANT_CAPABILITIES } from "./capabilities";
import { ASSISTANT_LIMITATIONS } from "./limitations";
import { ASSISTANT_ETHICS } from "./ethics";
import { ASSISTANT_COMMUNICATION } from "./communication";

export const ASSISTANT_MODULE = {

  id: "assistant",

  name: "Assistant",

  version: "1.0.0",

  description:
    "Defines Clara's identity, personality, capabilities, ethical framework and communication style.",

  identity: ASSISTANT_IDENTITY,

  personality: ASSISTANT_PERSONALITY,

  capabilities: ASSISTANT_CAPABILITIES,

  limitations: ASSISTANT_LIMITATIONS,

  ethics: ASSISTANT_ETHICS,

  communication: ASSISTANT_COMMUNICATION,

} as const;