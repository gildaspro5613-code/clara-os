import { buildBrainContext } from "../../brain/brain-context-builder";
import { KnowledgeEngine } from "../engine";
import { CLARA_LIVE_MODULE } from "./module";

/**
 * Lightweight contract assertions kept dependency-free so the Knowledge V1
 * boundary can be checked without introducing a test framework.
 */
export function assertClaraLiveKnowledgeContract(): void {
  const engine = new KnowledgeEngine();
  const modules = engine.getModules();

  if (modules[0]?.id !== "foundation") {
    throw new Error("Knowledge contract regression: Foundation must remain loaded first.");
  }

  if (engine.getModule(CLARA_LIVE_MODULE.id) !== CLARA_LIVE_MODULE) {
    throw new Error("Knowledge contract regression: Clara Live module is not registered.");
  }

  if (modules.filter((module) => module.id === "clara-live").length !== 1) {
    throw new Error("Knowledge contract regression: Clara Live must be registered exactly once.");
  }
}

/**
 * Compile-time integration guard: BrainContext's knowledge member remains a
 * KnowledgeEngine. Runtime execution is intentionally outside this contract.
 */
export type BrainKnowledgeContract = ReturnType<typeof buildBrainContext>["knowledge"] extends KnowledgeEngine
  ? true
  : never;
