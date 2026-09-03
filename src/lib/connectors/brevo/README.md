# Brevo connector V1 architecture note

The adapter reuses `Connection`, `ConnectionRepository`, encrypted
`CredentialStore`, and the provider-agnostic `ConnectionResolver`. A connection
contains only public metadata; OAuth credentials are loaded by `connectionId`.
The declarative definition carries autonomy-relevant READ/PREPARE/WRITE/EXECUTE metadata
but never grants permission or executes an operation. Runtime and Autonomy Gate
remain the callers of the adapter.

Brevo now supplies an adapter to the provider-agnostic OAuth authorization-code
and on-demand refresh foundation. It uses the same normalized credential shape
as `CredentialStore`; no Brevo-specific repository is introduced. Connect and
callback routes and commercial onboarding remain deliberately deferred.

Webhook event types and parsing are included for later Journal ingestion. No
route, polling loop, event bus, signature policy, or Journal wiring is added.
