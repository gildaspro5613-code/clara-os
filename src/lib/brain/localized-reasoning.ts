import type { Context, Memory, Understanding } from "@/types";
import type { KnowledgeEngine } from "@/lib/knowledge";
import type { Mission } from "@/modules/missions/types/Mission";
import type { BrainSourceContext } from "./brain-source";
import { reasoning } from "./reasoning";

const supportedLocales = ["fr", "en", "es", "de", "it"] as const;
type BrainLocale = (typeof supportedLocales)[number];

const copy: Record<
  BrainLocale,
  { system: string; processing: (event: string) => string; prioritize: string }
> = {
  fr: {
    system: "Système",
    processing: (event) => `Traitement de l’événement ${event}.`,
    prioritize: "Prioriser",
  },
  en: {
    system: "System",
    processing: (event) => `Processing event ${event}.`,
    prioritize: "Prioritize",
  },
  es: {
    system: "Sistema",
    processing: (event) => `Procesando el evento ${event}.`,
    prioritize: "Priorizar",
  },
  de: {
    system: "System",
    processing: (event) => `Ereignis ${event} wird verarbeitet.`,
    prioritize: "Priorisieren",
  },
  it: {
    system: "Sistema",
    processing: (event) => `Elaborazione dell’evento ${event}.`,
    prioritize: "Dare priorità",
  },
};

function resolveBrainLocale(locale: string): BrainLocale {
  return supportedLocales.includes(locale as BrainLocale)
    ? (locale as BrainLocale)
    : "fr";
}

/**
 * Locale-aware presentation boundary for Brain reasoning.
 *
 * The reasoning engine remains provider-agnostic. This adapter localizes
 * the deterministic fallback used by the Brain dashboard when there is no
 * user message to reason about, while preserving real mission/user content.
 */
export async function localizedReasoning(
  context: Context,
  memory: Memory,
  sources: BrainSourceContext[] = [],
  mission?: Mission,
  capabilities: Array<{
    id: string;
    name: string;
    description: string;
  }> = [],
  knowledge?: KnowledgeEngine,
  locale = "fr",
): Promise<Understanding> {
  const result = await reasoning(
    context,
    memory,
    sources,
    mission,
    capabilities,
    knowledge,
  );

  const language = copy[resolveBrainLocale(locale)];
  const genericSummary = `Processing event of type ${context.event.type}.`;

  if (
    result.intent === context.event.type &&
    result.summary === genericSummary
  ) {
    return {
      ...result,
      intent:
        context.event.type === "SYSTEM"
          ? language.system
          : context.event.type,
      summary: language.processing(context.event.type),
      nextAction:
        result.nextAction === "prioritize"
          ? language.prioritize
          : result.nextAction,
      actions: result.actions.map((action) =>
        action === "prioritize" ? language.prioritize : action,
      ),
    };
  }

  return result;
}
