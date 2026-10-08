# Dedicated Clara Live authentication

These variables belong to the Clara OS server deployment. Do not expose them
through `NEXT_PUBLIC_*` or Next.js `env` configuration.

- `CLARA_LIVE_PRODUCT_TOKEN`: server credential supplied securely by an administrator.
- `CLARA_LIVE_WORKSPACE_ID`: existing OS workspace for Clara Live, not a Live project ID.
- `CLARA_LIVE_CAPABILITIES`: JSON array of explicit capability IDs. Use `[]` for
  the conversation-only connection; no Stripe grants are required. Empty grants
  permit authentication but deny every operation through `/api/external/capabilities`.

All three must be configured together. Blank variables, partial or invalid dedicated
configuration throws a generic configuration error; it never falls back to legacy
Live credentials or grants. Since the registry is shared, invalid dedicated
configuration can make external routes return 503 for other products too. Validate
the complete configuration before publishing a deployment.

When all three are absent, existing JSON behavior is unchanged. When valid, only
the `clara-live` entry is overridden. Other JSON products and the dedicated Studio
variables `CLARA_MD_PRODUCT_TOKEN` / `CLARA_MD_WORKSPACE_ID` remain supported.
Legacy JSON products still require nonempty capability lists; this exception is
limited to dedicated Clara Live configuration. Callback authorization remains
separate in Clara Live and is not granted by this capability list.
The legacy Live `callbackBaseUrl`, if present, is retained and must use HTTPS.
An invalid JSON syntax still permits configured dedicated products, as the existing
Studio fallback does; it cannot recover other products from unreadable JSON.

The incoming contract remains `clara.unified-core.event.v1`, with
`x-clara-product: clara-live` and Bearer authentication. The existing Live client
requires no code change. An administrator must coordinate its
`CLARA_OS_PRODUCT_TOKEN` with the OS dedicated credential, including callbacks:
OS uses the product credential to authenticate its callbacks to Live.

After human approval, configure all three OS variables without replacing
`CLARA_EXTERNAL_PRODUCTS_JSON`, preserve the existing workspace/grants, coordinate
the Live server credential, and deploy deliberately. No overlapping credentials
are accepted, so plan a short interruption. Validate authentication and other
integrations without logging credentials. Review callback availability separately
if the JSON does not contain a Live callback destination.

This change does not modify Vercel, provision credentials, merge, or deploy.
