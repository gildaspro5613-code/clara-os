/**
 * Microsoft connections must not use the legacy global "default" workspace.
 * This gate deliberately fails closed until Clara OS has an authenticated,
 * server-verified workspace/session resolver. A request parameter, cookie,
 * or environment-provided workspace ID is NOT sufficient authorization.
 */
export function microsoftWorkspaceGate(): Response {
  return Response.json(
    {
      error: "MICROSOFT_WORKSPACE_AUTH_REQUIRED",
      message: "Microsoft connector activation requires authenticated workspace isolation.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
