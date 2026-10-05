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

  const missing = new Set(record.qualification.qualification.missing);
  const questions: string[] = [];

  if (missing.has("location")) {
    questions.push("Pouvez-vous me préciser le lieu prévu pour cet événement (ville et, si possible, site ou établissement) ?");
  }
  if (missing.has("schedule")) {
    questions.push("Pouvez-vous me confirmer la date ou la période prévue pour l’événement ?");
  }
  if (missing.has("disciplines")) {
    questions.push("Pouvez-vous me préciser les domaines techniques concernés par votre projet ?");
  }
  if (missing.has("contactName")) {
    questions.push("Pouvez-vous me confirmer le nom de la personne à contacter pour la suite de ce dossier ?");
  }

  const structuredSchedule = record.qualification.opportunity.schedule?.trim();
  const brief = record.qualification.opportunity.brief;
  const mentionsRelativeSchedule = /\b(dans|d’ici)\s+(?:environ\s+)?(?:\d+|un|une|deux|trois|quatre|cinq|six)\s+(?:mois|semaines?)\b/i.test(brief);
  if (structuredSchedule && mentionsRelativeSchedule) {
    questions.push(`J’ai également relevé une indication de calendrier à confirmer : la date renseignée est ${structuredSchedule}, tandis que votre message mentionne une échéance relative. Pouvez-vous me confirmer la date à retenir ?`);
  }

  if (questions.length === 0) return null;

  const firstName = intake.contact.name.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const body = [
    greeting,
    "",
    "Merci pour votre demande auprès de Mélodie Digital. J’ai commencé à structurer votre projet afin de pouvoir poursuivre sa qualification.",
    "",
    "Il me manque simplement quelques précisions :",
    ...questions.map((question) => `• ${question}`),
    "",
    "Dès réception de ces éléments, je pourrai poursuivre la préparation de votre dossier.",
    "",
    "Bien cordialement,",
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
    subject: `Votre projet ${record.qualification.opportunity.projectType} — précisions complémentaires`,
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
