import type { Mission } from "@/modules/missions/types/Mission";
import type { ClaraSession } from "./session";
import type { StoredClaraSession } from "./store/session-store";
import { DEFAULT_SESSION_KEY } from "./session-key";

export function projectOwnedSession(
  mission: Mission | null,
  owner: StoredClaraSession | null,
  defaultSession: ClaraSession,
): { sessionKey: string; session: ClaraSession } {
  const sourceSession = owner?.session ?? defaultSession;
  return {
    sessionKey: owner?.key ?? DEFAULT_SESSION_KEY,
    session: {
      ...sourceSession,
      recommendation: mission && !owner ? null : sourceSession.recommendation,
      brainDashboard: mission && !owner ? null : sourceSession.brainDashboard,
      mission,
    },
  };
}
