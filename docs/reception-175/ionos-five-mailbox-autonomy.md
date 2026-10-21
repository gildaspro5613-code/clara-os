# Clara OS — five IONOS mailboxes, advisory triage and autonomous monitoring

Status: **implementation in progress / NO-GO production**. No real IONOS credentials
were read or configured, no real mail was received or sent, and no monitoring
worker has been activated. This is not a production acceptance certificate.

## Scope and already implemented (PR #176)

- Confirmed IONOS addresses: `clara@`, `gildas@`, `contact@`, `info@`,
  `support@melodie.digital` (all on `melodie.digital`).
- `transport.ts` accepts exactly these five reviewed addresses; the default
  network-disabled fence remains in force.
- Additive migration 021 extends the mailbox-authority address constraint.
  **It does not provision any connection, mailbox owner, credential, delegation
  or service principal**. The existing two-box migration 016 is unchanged.
- `mail-triage.ts` provides deterministic, multilingual **advisory** priority
  for previously synchronized messages, with conservative handling of claimed
  urgency and quarantine. It cannot authorize any operation.
- `GET /api/native/mail?action=overview` is a scoped, read-only snapshot
  across at most five **already authorized** mailbox connections. It returns
  only the first cached page per mailbox, declares `freshnessVerified:false`,
  never invokes IMAP and does not infer unread state.
- The existing Clara mail panel shows the advisory priority in FR/EN/ES/DE/IT.
  The Cockpit continues to have no email panel.

## Not yet implemented / required before operational acceptance

1. **Administrative provisioning**: explicitly attest the five connection IDs,
   canonical owner IDs and workspace scope; store separate encrypted IMAP/SMTP
   credentials through a reviewed administrative channel. Never collect secrets
   in chat, logs, the browser, or source control. Current runtime
   `mailCredentialStore.save` deliberately refuses provisioning.
2. **Real provider certification**: verify each IONOS mailbox's actual server
   settings and permissions. Enable `CLARA_IONOS_NETWORK_ENABLED` only after
   the provider and the deployment target have been separately approved.
3. **Background polling authority**: implement an explicitly approved,
   revocable, narrowly scoped server worker identity per mailbox. A CRON_SECRET
   alone is NOT mailbox authorization; never store or replay a user's session
   cookie. Reuse the existing scheduled-job infrastructure without modifying
   the two existing `vercel.json` cron entries unless independently approved.
4. **Durable, bounded monitoring**: IMAP cursor CAS per connection/folder,
   idempotent message identity (connection, folder, UIDVALIDITY, UID), bounded
   batches, per-mailbox isolation, retry/backoff only for reads, encrypted
   metadata, durable triage state and explicit monitoring freshness/health.
   Never silently classify a stale cache as up to date.
5. **Contextual triage**: use existing Contacts, Missions, Brain and Journal to
   refine priority and route correspondence. Treat email as untrusted data;
   do not infer a new contact/mission binding from sender address alone.
   No automatic deletion, external link execution or message forwarding.
6. **Clara voice/chat workflow**: deliver a concise morning/on-demand summary
   of actionable items, prepare responses in the correspondent's language,
   retain the durable mission/mail context, and request an explicit approval
   bound to the exact sender, recipients, subject, body and attachments.
   Never send without that approval; never automatically retry uncertain SMTP.
7. **End-to-end acceptance**: isolated PostgreSQL/browser tests and real
   owner-approved read-only IONOS smoke tests for all five boxes; cross-owner
   denials, restart recovery, multilingual samples, alert accuracy, duplicate
   prevention, approval expiry, and proof of zero unapproved SMTP calls.

## Production fence

PR #176 stays Draft. No merge, Vercel Preview, production migration,
production secret update, live email or Clara Live changes without separate
verified approvals. A passing isolated CI run is not real provider acceptance.
