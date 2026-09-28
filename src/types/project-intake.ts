export const MD_PROJECT_INTAKE_SCHEMA = "md.project-intake.v1" as const;

export interface MdProjectIntake {
  schema: typeof MD_PROJECT_INTAKE_SCHEMA;
  source: {
    system: "melodie-digital-site";
    channel: "website";
    locale: string;
  };
  contact: {
    name: string;
    email: string;
  };
  request: {
    projectType: string;
    disciplines: string[];
    location: string;
    schedule: string;
    brief: string;
  };
  orchestration: {
    owner: "clara-os";
    initialState: "received";
    specialistRouting: "clara-os-decides";
    humanApproval: "required-for-committing-actions";
  };
  receivedAt: string;
}

export function isMdProjectIntake(value: unknown): value is MdProjectIntake {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<MdProjectIntake>;
  return data.schema === MD_PROJECT_INTAKE_SCHEMA
    && data.source?.system === "melodie-digital-site"
    && data.source?.channel === "website"
    && data.orchestration?.owner === "clara-os"
    && typeof data.contact?.email === "string"
    && typeof data.request?.projectType === "string"
    && typeof data.request?.brief === "string"
    && Array.isArray(data.request?.disciplines)
    && typeof data.receivedAt === "string";
}
