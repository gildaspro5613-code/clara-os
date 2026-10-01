import type { AcquisitionQualification } from "./qualification";

export type AcquisitionDecisionKind =
  | "review-missing-information"
  | "review-specialist-routing"
  | "review-opportunity";

export interface AcquisitionDecisionBrief {
  schema: "clara.acquisition-decision-brief.v1";
  submissionId: string;
  headline: string;
  understood: string[];
  missing: string[];
  claraCanContinue: string[];
  proposedSpecialistReview: string[];
  decision: {
    required: boolean;
    kind: AcquisitionDecisionKind;
    question: string;
  };
}

export function buildAcquisitionDecisionBrief(
  qualification: AcquisitionQualification,
): AcquisitionDecisionBrief {
  const opportunity = qualification.opportunity;
  const understood = [
    `Type : ${opportunity.projectType}`,
    opportunity.disciplines.length > 0
      ? `Disciplines : ${opportunity.disciplines.join(", ")}`
      : null,
    opportunity.location ? `Lieu : ${opportunity.location}` : null,
    opportunity.schedule ? `Calendrier : ${opportunity.schedule}` : null,
    `Brief : ${opportunity.brief}`,
  ].filter((item): item is string => item !== null);

  const proposedSpecialistReview =
    qualification.qualification.specialistNeed === "candidate"
      ? qualification.qualification.specialistDomains
      : [];

  if (qualification.qualification.missing.length > 0) {
    return {
      schema: "clara.acquisition-decision-brief.v1",
      submissionId: qualification.submissionId,
      headline: qualification.clara.summary,
      understood,
      missing: [...qualification.qualification.missing],
      claraCanContinue: [
        "Structurer le dossier d'opportunité.",
        "Préparer les questions strictement nécessaires.",
        "Conserver le contexte pour la prochaine interaction.",
      ],
      proposedSpecialistReview,
      decision: {
        required: false,
        kind: "review-missing-information",
        question: "Clara peut poursuivre la qualification sans décision engageante.",
      },
    };
  }

  if (proposedSpecialistReview.length > 0) {
    return {
      schema: "clara.acquisition-decision-brief.v1",
      submissionId: qualification.submissionId,
      headline: qualification.clara.summary,
      understood,
      missing: [],
      claraCanContinue: [
        "Structurer le dossier d'opportunité.",
        "Préparer le contexte à transmettre au spécialiste.",
        "Lancer l'expertise spécialisée interne lorsqu'elle reste préparatoire et non engageante.",
      ],
      proposedSpecialistReview,
      decision: {
        required: false,
        kind: "review-specialist-routing",
        question: "Clara OS peut solliciter l'expertise spécialisée interne sans validation humaine préalable.",
      },
    };
  }

  return {
    schema: "clara.acquisition-decision-brief.v1",
    submissionId: qualification.submissionId,
    headline: qualification.clara.summary,
    understood,
    missing: [],
    claraCanContinue: ["Structurer le dossier d'opportunité."],
    proposedSpecialistReview: [],
    decision: {
      required: true,
      kind: "review-opportunity",
      question: "Examiner l'opportunité qualifiée et décider de la prochaine action engageante.",
    },
  };
}
