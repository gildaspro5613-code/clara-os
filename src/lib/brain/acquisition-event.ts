import type { Context } from "@/types";

const supportedLocales = new Set(["fr", "en", "es", "de", "it"]);

export function acquisitionLocale(context: Context): string {
  const locale = context.metadata?.locale;
  return typeof locale === "string" && supportedLocales.has(locale)
    ? locale
    : "fr";
}

export function extractAcquisitionInput(context: Context): string | null {
  if (
    context.event.type !== "PROJECT_INTAKE_RECEIVED" ||
    !context.event.payload ||
    typeof context.event.payload !== "object"
  ) return null;

  const payload = context.event.payload as {
    submissionId?: unknown;
    source?: { system?: unknown; channel?: unknown; locale?: unknown };
    contact?: { name?: unknown; email?: unknown };
    request?: {
      projectType?: unknown;
      disciplines?: unknown;
      location?: unknown;
      schedule?: unknown;
      brief?: unknown;
    };
    orchestration?: {
      owner?: unknown;
      specialistRouting?: unknown;
      humanApproval?: unknown;
    };
  };

  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : "non précisé";
  const disciplines = Array.isArray(payload.request?.disciplines)
    ? payload.request.disciplines
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .join(", ") || "non précisées"
    : "non précisées";

  return [
    "NOUVELLE DEMANDE PROJET À QUALIFIER",
    `Identifiant de soumission : ${text(payload.submissionId)}`,
    `Canal : ${text(payload.source?.channel)}`,
    `Source : ${text(payload.source?.system)}`,
    `Locale : ${text(payload.source?.locale)}`,
    `Contact : ${text(payload.contact?.name)}`,
    `Email : ${text(payload.contact?.email)}`,
    `Type de projet : ${text(payload.request?.projectType)}`,
    `Expertises : ${disciplines}`,
    `Lieu : ${text(payload.request?.location)}`,
    `Calendrier : ${text(payload.request?.schedule)}`,
    `Brief : ${text(payload.request?.brief)}`,
    `Propriétaire orchestration : ${text(payload.orchestration?.owner)}`,
    `Routage spécialiste : ${text(payload.orchestration?.specialistRouting)}`,
    `Gouvernance : ${text(payload.orchestration?.humanApproval)}`,
    "",
    "Objectif : qualifier la demande, distinguer les informations suffisantes des informations réellement manquantes, préparer les prochaines actions et déterminer si une expertise spécialisée est utile. Ne crée pas de client, devis, engagement commercial ou action externe sans la gouvernance prévue.",
  ].join("\n");
}
