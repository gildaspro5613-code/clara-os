# Microsoft connector — authenticated workspace contract

Status: **blocked by design** until Clara OS has an authenticated workspace/session boundary. No customer connection is enabled by this branch.

## Audit (2026-09-23)

- `src/lib/connections/current-workspace.ts` exports a global `default` workspace.
- `src/lib/core/store/session-store.ts` persists the Clara runtime session under global `default`.
- `src/lib/core/workspace/workspace-store.ts` persists the workspace under global `default`.
- `src/lib/core/session.ts` has a first-name conversational identity fallback, **not** an authenticated principal.
- `src/proxy.ts` handles locale only and explicitly excludes API routes.
- Microsoft GET, connect, callback and cloud-pcs routes are currently fail-closed (503).

## Required before unlocking Microsoft

1. Introduce a server-verified authenticated principal and workspace membership resolver shared by Clara OS connectors. The principal must derive from a validated server session, not a client-supplied workspace ID, locale cookie, query parameter or static environment variable.
2. Authorize the current principal to connect/disconnect Microsoft and read Cloud PC metadata for that workspace. Check membership on **every** Microsoft route.
3. Bind the OAuth state and connection record to the authorized workspace and initiating principal. Validate that binding at callback time; reject replay, cross-workspace and cross-user attempts. Preserve nonce and state validation.
4. Verify the tenant and granted scopes returned by Microsoft, and bind the authorized Microsoft tenant to the workspace. Treat admin consent and account-type restrictions explicitly.
5. Store credentials and query connection records only by the authorized workspace and provider; ensure DB constraints and authorization prevent cross-tenant access.
6. Add negative tests for anonymous, cross-workspace, cross-user, mismatched OAuth state/tenant and unauthorized Cloud PC access. Test with a dedicated non-customer Microsoft test tenant only after these checks pass.
7. Only then replace the fail-closed gate. Do not expose Microsoft credentials or Cloud PC inventory to Clara's public runtime endpoints without authorization.

Do not remove the 503 gate merely to make OAuth work. This connector does not perform remote Windows GUI control.
