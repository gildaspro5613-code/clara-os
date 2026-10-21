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
  never invokes IMAP and does not infer unread state. A failed mailbox is
  isolated as `status:unavailable` with null counts; other authorized mailboxes
  remain visible. `complete:false` means a mailbox failed or a cached page is
  truncated. Neither `complete:true` nor `status:cached` attests live freshness.
- The dedicated authenticated **OPÉRER → Messagerie** page (`/messagerie`)
  shows the advisory priority in FR/EN/ES/DE/IT. Mail controls have been
  removed from Clara and Documents; the Cockpit has no email panel.
- Migration 022 introduces per-connection opt-in monitoring grants and a
  SECURITY INVOKER authority check, denied by default. It does **not**
  provision a worker identity or grant worker database access.

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

## Isolated CI acceptance checkpoint (2026-10-21)

- The five primary HTTPS browser tests, including the simulated IONOS owner
  approval and restart flow, passed on the earlier `4e90a20` CI run.
- The same run failed the **functional closure** browser test because it still
  expected the mail panel on `/documents`; the test now targets `/messagerie`
  and explicitly asserts the panel is absent on `/clara`.
- The latest `dcf98eac` Native resource authority workflow was still running
  when this note was updated. Do not interpret five other green workflows as
  a completed six-workflow acceptance.
- Background monitoring is not implemented or scheduled. The next change must
  provide a distinct least-privilege service identity, atomic per-mailbox
  generation fencing and durable cursor commits; CRON_SECRET must never be
  treated as sufficient database authority. No SMTP code path in that worker.
