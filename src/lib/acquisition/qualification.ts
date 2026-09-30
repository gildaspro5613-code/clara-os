import type { MdProjectIntake, Understanding } from "@/types";

export type AcquisitionCompleteness = "ready" | "needs-information";
export type AcquisitionSpecialistNeed = "not-indicated" | "candidate";

export interface AcquisitionQualification {
  schema: "clara.acquisition-qualification.v1";
  submissionId: string;
  source: {
    system: string;
    channel: string;
    locale: string;
  };
  opportunity: {
    projectType: string;
    disciplines: string[];
    location: string | null;
    schedule: string | null;
    brief: string;
  };
  qualification: {
    completeness: AcquisitionCompleteness;
    acquired: string[];
    missing: string[];
    specialistNeed: AcquisitionSpecialistNeed;
    specialistDomains: string[];
  };
  clara: {
    summary: string;
    nextAction: string;
    confidence: number;
  };
  governance: {
    owner: "clara-os";
    humanApproval: "required-for-committing-actions";
  };
}

function present(value: string): boolean {
  return value.trim().length > 0;
}

export function qualifyProjectIntake(
  intake: MdProjectIntake,
  understanding: Understanding,
): AcquisitionQualification {
  const acquired: string[] = ["projectType", "brief", "contactEmail"];
  const missing: string[] = [];

  if (intake.request.disciplines.length > 0) acquired.push("disciplines");
  else missing.push("disciplines");

  if (present(intake.request.location)) acquired.push("location");
  else missing.push("location");

  if (present(intake.request.schedule)) acquired.push("schedule");
  else missing.push("schedule");

  if (present(intake.contact.name)) acquired.push("contactName");
  else missing.push("contactName");

  const specialistDomains = intake.request.disciplines
    .map((discipline) => discipline.trim())
    .filter(Boolean);

  return {
    schema: "clara.acquisition-qualification.v1",
    submissionId: intake.submissionId,
    source: {
      system: intake.source.system,
      channel: intake.source.channel,
      locale: intake.source.locale,
    },
    opportunity: {
      projectType: intake.request.projectType,
      disciplines: [...intake.request.disciplines],
      location: present(intake.request.location) ? intake.request.location : null,
      schedule: present(intake.request.schedule) ? intake.request.schedule : null,
      brief: intake.request.brief,
    },
    qualification: {
      completeness: missing.length === 0 ? "ready" : "needs-information",
      acquired,
      missing,
      specialistNeed: specialistDomains.length > 0 ? "candidate" : "not-indicated",
      specialistDomains,
    },
    clara: {
      summary: understanding.summary,
      nextAction: understanding.nextAction,
      confidence: understanding.confidence,
    },
    governance: {
      owner: "clara-os",
      humanApproval: "required-for-committing-actions",
    },
  };
}
