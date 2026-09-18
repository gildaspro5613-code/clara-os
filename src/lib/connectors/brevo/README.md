# Brevo Native Capability Layer V2

Brevo is a native Clara OS provider. Contacts, lists, templates, transactional
email, campaigns and statistics execute directly against Brevo; none of these
operations depends on Make.

The adapter reuses `Connection`, `ConnectionRepository`, encrypted
`CredentialStore`, and the provider-agnostic `ConnectionResolver`. Runtime
and the Autonomy Gate remain responsible for authorization before WRITE or
EXECUTE operations reach the provider boundary.

## Native capability surface

- contacts: search and upsert
- lists: add/remove membership
- templates: search/read
- transactional email: prepare and send
- campaigns: read, create/prepare and update
- statistics: transactional/campaign reads

The adapter returns the shared `OperationalCapabilityResult` envelope introduced
for connector-backed operational capabilities. `BrevoExecutableConnector`
provides the generic `ConnectorEngine` boundary.

OAuth uses the shared provider-neutral OAuth foundation and encrypted credential
storage. Connect/callback routes and the commercial UI remain separate follow-up
work; they must not introduce a Make dependency.

Webhook parsing remains credential-free and is intended for later Journal
ingestion (delivery, open, click, bounce, block and unsubscribe events).
