/**
 * ============================================
 * CLARA OS
 * Integration Test
 * --------------------------------------------
 * File : capability-engine.test.ts
 * Responsibility :
 * Verifies that the Capability Engine
 * can execute a registered capability.
 * ============================================
 */

import { CapabilityEngine } from "@/lib/capabilities/capability-engine";

async function run() {

  const engine = new CapabilityEngine();

  const result = await engine.execute({

    capabilityId: "generate-document",

    context: {

      title: "Commercial Proposal",

      objective: "Present Clara OS",

      audience: "Festival",

      language: "French",

      tone: "Professional",

    },

  });

  console.log(result);

}

run();