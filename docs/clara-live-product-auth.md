# Dedicated Clara Live authentication

These variables belong to the Clara OS server deployment. Do not expose them
through `NEXT_PUBLIC_*` or Next.js `env` configuration.

- `CLARA_LIVE_PRODUCT_TOKEN`: server credential supplied securely by an administrator.
- `CLARA_LIVE_WORKSPACE_ID`: existing OS workspace for Clara Live, not a Live project ID.
- `CLARA_LIVE_CAPABILITIES`: JSON array of explicit capability IDs. Use `[]` for
  the conversation-only connection; no Stripe grants are required. Empty grants
  permit authentication but deny every operation through `/api/external/capabilities`.
- `CLARA_LIVE_CALLBACK_BASE_URL`: optional HTTPS base URL of Clara Live, without
  `/api/core/capabilities/execute`. For example, `https://live.example.com`.
  Trailing slashes are normalized. Embedded credentials, query/fragment,
  malformed hosts, IP literals, localhost and local/internal destinations are
  refused with a generic error. Use a public DNS hostname; validation does not
  verify DNS resolution, network reachability or protection rules.

The three authentication variables must be configured together. The callback alone
does not constitute valid dedicated authentication. Blank variables, partial or invalid dedicated
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
The dedicated callback, when configured, takes precedence over the legacy Live
`callbackBaseUrl`. When absent, the legacy callback behavior is unchanged.
Other products' callbacks are unchanged. The callback is optional for incoming
authentication, but a destination is necessary for OS → Live operations.
An invalid JSON syntax still permits configured dedicated products, as the existing
Studio fallback does; it cannot recover other products from unreadable JSON.

The incoming contract remains `clara.unified-core.event.v1`, with
`x-clara-product: clara-live` and Bearer authentication. The existing Live client
requires no code change. An administrator must coordinate its
`CLARA_OS_PRODUCT_TOKEN` with the OS dedicated credential, including callbacks:
OS uses the product credential to authenticate its callbacks to Live.

After human approval:

1. Validate the actual OS workspace and public Live HTTPS destination; confirm
   that the base URL does not already include the callback route suffix.
2. Prepare all three authentication variables together, with
   `CLARA_LIVE_CAPABILITIES=[]` for conversation-only access. Configure the optional
   callback variable to enable OS → Live independently of the historical JSON.
3. Coordinate the credential with Live's existing `CLARA_OS_PRODUCT_TOKEN` securely.
   Do not replace `CLARA_EXTERNAL_PRODUCTS_JSON` or change Studio configuration.
4. Deploy deliberately after approval and test incoming events plus a read-only
   callback, then other products. No overlapping credentials are accepted; plan
   a short interruption. Never log credentials or complete configuration values.

This change does not modify Vercel, provision credentials, merge, or deploy.
