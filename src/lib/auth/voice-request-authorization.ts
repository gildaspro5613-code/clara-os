import { authorizeClaraRequest } from "./canonical-request-authorization";
import { isSameOriginRequest } from "./session-request-security";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";

/** Existing operator authority only; no caller-selected workspace or provider identity. */
export async function authorizeVoiceRequest(request: Request): Promise<boolean> {
  if (/(?:^|;)\s*clara_native_selection=/.test(request.headers.get("cookie")??"") || new URL(request.url).searchParams.has("sessionId") || request.headers.get("x-clara-native-voice")==="1") return false;
  if (request.method !== "GET" && !isSameOriginRequest(request.headers.get("origin"), process.env.CLARA_AUTH_APP_ORIGIN)) return false;
  return Boolean(await authorizeClaraRequest(request.headers.get("cookie"), CURRENT_WORKSPACE_ID, "connections:manage"));
}
