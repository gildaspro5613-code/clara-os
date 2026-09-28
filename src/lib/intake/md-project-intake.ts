import { EventType, type Event, type MdProjectIntake, isMdProjectIntake } from "@/types";

export interface ProjectIntakeResult {
  event: Event;
  intake: MdProjectIntake;
}

export function receiveMdProjectIntake(payload: unknown): ProjectIntakeResult {
  if (!isMdProjectIntake(payload)) {
    throw new Error("INVALID_MD_PROJECT_INTAKE");
  }

  const receivedAt = new Date(payload.receivedAt);
  if (Number.isNaN(receivedAt.getTime())) {
    throw new Error("INVALID_MD_PROJECT_INTAKE_TIMESTAMP");
  }

  return {
    intake: payload,
    event: {
      id: crypto.randomUUID(),
      type: EventType.PROJECT_INTAKE_RECEIVED,
      source: payload.source.system,
      timestamp: receivedAt,
      payload,
      context: {
        metadata: {
          schema: payload.schema,
          channel: payload.source.channel,
          locale: payload.source.locale,
        },
      },
    },
  };
}
