import { isRecetteRuntime } from "@/lib/recette/external-execution-guard";
import { validateRecetteDatabaseBinding } from "@/lib/recette/database-binding";

/** Authentication only. Never authorizes Workspace, Drive or other business transports.
 * Configuration checks are not a deployment/branch attestation; that remains a release gate.
 */
export function assertGoogleSignInAllowed(): void {
  if (!isRecetteRuntime()) return;
  try {
    if (validateRecetteDatabaseBinding(process.env) !== "OK") throw new Error();
    const origin = new URL(process.env.CLARA_AUTH_APP_ORIGIN ?? "");
    const callback = new URL(process.env.CLARA_AUTH_GOOGLE_REDIRECT_URI ?? "");
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.port ||
        origin.pathname !== "/" || origin.search || origin.hash ||
        !/^clara-os-recette(?:-[a-z0-9]+-melodie-digital)?\.vercel\.app$/.test(origin.hostname) ||
        callback.href !== new URL("/api/auth/google/callback", origin).href) throw new Error();
  } catch {
    throw new Error("RECETTE_EXTERNAL_EXECUTION_DENIED:auth.provider-sign-in");
  }
}
