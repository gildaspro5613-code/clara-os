import { createTranslator } from "next-intl";
import { resolveLocale } from "@/i18n/config";
import fr from "@/i18n/messages/fr/commercial-draft.json";
import en from "@/i18n/messages/en/commercial-draft.json";
import es from "@/i18n/messages/es/commercial-draft.json";
import de from "@/i18n/messages/de/commercial-draft.json";
import it from "@/i18n/messages/it/commercial-draft.json";
import type { AcquisitionRecord } from "./acquisition-store";
import type { MdProjectIntake } from "@/types";

export interface CommercialCommunicationDraft {
  schema: "clara.commercial-communication-draft.v1";
  submissionId: string;
  channel: "email";
  sender: {
    identity: "commercial";
    email: "clara@melodie.digital";
    name: "Clara — Mélodie Digital";
  };
  recipient: {
    name: string;
    email: string;
  };
  subject: string;
  body: string;
  revision: number;
  updatedAt: string;
  approval: {
    required: true;
    status: "pending" | "approved" | "rejected";
  };
  delivery: {
    allowed: false;
    reason: "operator-approval-required" | "transport-not-configured" | "operator-rejected";
  };
}

export function buildCommercialQualificationDraft(
  record: AcquisitionRecord,
  intake: MdProjectIntake,
): CommercialCommunicationDraft | null {
  if (record.lifecycle.state !== "qualifying") return null;
  if (record.qualification.qualification.completeness !== "needs-information") return null;

  // Use only the declared intake locale; never infer it from name/email or UI language.
  const locale = resolveLocale(intake.source?.locale?.toLowerCase().split(/[-_]/)[0]);
  const t = createTranslator({ locale, messages: { fr, en, es, de, it }[locale] });
  const missing = new Set(record.qualification.qualification.missing);
  const questions: string[] = [];

  if (missing.has("location")) {
    questions.push(t("location"));
  }
  if (missing.has("schedule")) {
    questions.push(t("schedule"));
  }
  if (missing.has("disciplines")) {
    questions.push(t("disciplines"));
  }
  if (missing.has("contactName")) {
    questions.push(t("contactName"));
  }

  const structuredSchedule = record.qualification.opportunity.schedule?.trim();
  const brief = record.qualification.opportunity.brief;
  const mentionsRelativeSchedule = /\b(dans|d’ici)\s+(?:environ\s+)?(?:\d+|un|une|deux|trois|quatre|cinq|six)\s+(?:mois|semaines?)\b/i.test(brief);
  if (structuredSchedule && mentionsRelativeSchedule) {
    questions.push(t("scheduleConflict", {schedule: structuredSchedule}));
  }

  if (questions.length === 0) return null;

  const firstName = intake.contact.name.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? t("greeting", {name: firstName}) : t("anonymousGreeting");
  const body = [
    greeting,
    "",
    t("intro"),
    "",
    t("missing"),
    ...questions.map((question) => `• ${question}`),
    "",
    t("closing"),
    "",
    t("regards"),
    "Clara",
    "Mélodie Digital",
  ].join("\n");

  return {
    schema: "clara.commercial-communication-draft.v1",
    submissionId: record.submissionId,
    channel: "email",
    sender: {
      identity: "commercial",
      email: "clara@melodie.digital",
      name: "Clara — Mélodie Digital",
    },
    recipient: {
      name: intake.contact.name,
      email: intake.contact.email,
    },
    subject: t("subject", {projectType: record.qualification.opportunity.projectType}),
    body,
    revision: 1,
    updatedAt: new Date().toISOString(),
    approval: {
      required: true,
      status: "pending",
    },
    delivery: {
      allowed: false,
      reason: "operator-approval-required",
    },
  };
}
