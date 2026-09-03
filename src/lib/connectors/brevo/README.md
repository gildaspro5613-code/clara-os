# Brevo connector V1 architecture note

The adapter reuses `Connection`, `ConnectionRepository`, encrypted
`CredentialStore`, and the provider-agnostic `ConnectionResolver`. A connection
contains only public metadata; OAuth credentials are loaded by `connectionId`.
The declarative definition carries autonomy-relevant READ/PREPARE/WRITE/EXECUTE metadata
but never grants permission or executes an operation. Runtime and Autonomy Gate
remain the callers of the adapter.

The current repository has no provider-agnostic OAuth authorization-code or
refresh lifecycle: those implementations are Google-specific. Consequently this
foundation accepts stored Brevo OAuth access/refresh-token-shaped credentials,
but deliberately does not add connect/callback routes or refresh handling. The
missing reusable extension is an OAuth provider contract for authorization URL,
code exchange, token refresh, expiry, and persistence callbacks. This should be
added globally before Brevo OAuth onboarding is enabled.

Webhook event types and parsing are included for later Journal ingestion. No
route, polling loop, event bus, signature policy, or Journal wiring is added.
