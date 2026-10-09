# Durable external document operations

A documentary call can finish after Live's unchanged 20-second HTTP deadline.
An optional `operationId` on `LIVE_DOCUMENT_ANALYSIS_REQUESTED` reserves one
execution in the existing PostgreSQL database. Events without it retain their
existing behavior and response contract; no Brain, connector, permission or
external-product configuration is changed.

## Contract and ownership

- `operationId`: 64 lowercase hexadecimal characters. Live hashes its exact
  canonical documentary event (source revision, batch, instruction and stable
  project/user/session scope). No credentials are included or logged.
- OS independently fingerprints the body excluding `operationId`. Reusing an ID
  with a different body within the same authorization scope returns HTTP 409,
  `DOCUMENT_OPERATION_CONFLICT`, before Core dispatch.
- The primary key includes a hash of authenticated product, configured OS
  workspace, caller project workspace, user and session. The server credential
  remains the authority for product/OS-workspace identity. Caller user/project
  identity remains trusted only as supplied by that authenticated backend, as in
  the existing external event contract. No browser has direct registry access.
- A single `INSERT ... ON CONFLICT DO NOTHING RETURNING` grants execution.
  Concurrent losers do not call Core or analyze documents. An owner nonce fences
  completion. There is no lease stealing, retry queue or extra worker/service.
- The document result is saved before conversation persistence and before HTTP
  success. If conversation persistence subsequently fails, the document result
  remains recoverable; retrieval does not replay conversation side effects.
- A completed duplicate POST returns the original Core data. Other existing
  states return HTTP 202 with `{operationId,status,result:null}`. No execution is
  restarted. Registry unavailable returns HTTP 503 before dispatch for new
  durable requests; legacy requests do not need the new table.

`POST /api/external/document-operations/status` uses the existing Bearer token and
`x-clara-product` header, plus `{operationId,scope}` in its JSON body (never URL).
It returns `{success:true,data:{operationId,status,result}}`, with `no-store`.
`result` is the original Core data only for `completed`; an unknown or foreign
scope is HTTP 404. This read does not invoke Core/capabilities, and works with
`CLARA_LIVE_CAPABILITIES=[]`.

## Failure and retention policy

States: `processing`, `completed`, `failed`, `uncertain`, `expired`.
An observed processing exception marks `failed`. An invocation killed without
catch/finally remains `processing`; on consultation after 15 minutes it becomes
`uncertain`. Fifteen minutes is a diagnostic threshold, not execution timeout or
permission to retry. The original owner can still complete an uncertain call.
A storage outage can leave state uncertain even when computation finished.
No state other than the very first atomic reservation authorizes execution.
Manual investigation is required for failed/uncertain/expired operations. Never
reset a row, delete its tombstone or invent a new ID merely to bypass this rule.
There is no guarantee of recovering a computation killed **before** its durable
result write. This avoids falsely claiming exactly-once external model execution
across a crash. Successfully persisted results and Live checkpoints are immutable.

Results are available for seven days after completion. Expired results are
cleared on lookup and cannot be returned. Minimal tombstones (scope hash, ID,
fingerprint, status, ownership nonce and timestamps; no document text/result or
credential) remain indefinitely to prevent accidental reanalysis. Live's existing
checkpoint/project data retention is unchanged.
Clearing unconsulted expired JSON is prepared through the authenticated daily
Vercel Cron described in `docs/document-operations-daily-purge.md`, reusing
`db/maintenance/purge_document_operations.sql` without a new service. Human
authorization and production configuration checks remain required. The equivalent predicate is:

```sql
UPDATE clara_document_operations
SET status = 'expired', result = NULL, updated_at = clock_timestamp()
WHERE status = 'completed' AND expires_at <= clock_timestamp();
```

Until that maintenance is configured, API expiry is enforced but unconsulted
expired rows can remain physically stored. Validate this operational retention
step before activation; backups follow the existing database retention policy.

## Migration and deployment (human authorization required)

1. Review both PRs; validate in staging against the existing PostgreSQL version.
   Confirm backup coverage, database schema rights and daily retention maintenance.
   No environment variable, secret, JSON product registry or project data change
   is required. Capture the deployed OS/Live commit references for rollback.
2. In the correct existing OS database, an authorized administrator executes
   `db/migrations/005_document_operations.sql` using the secured database console.
   It is additive/transactional/repeatable and touches no existing table. It is
   **not** applied by importing the application or running a production build.
3. Check table/constraints/indexes using schema metadata, without reading any
   result/document/credential; deploy OS from `consolidation/clara-os-clean-base`
   with its reviewed corrective commit. Smoke-test authentication, a synthetic
   documentary operation, a duplicate/conflict and authenticated status.
4. Deploy Live from `deploy/clara-live-api` with its reviewed corrective commit.
   Use a synthetic dossier to test a delayed result, refresh/resume and reuse;
   do not mutate ORIGINS production data. Verify other external products and
   deterministic calculators with synthetic fixtures.
5. A pending Work Cycle stops the browser's automatic batch loop. The next
   explicit cycle consults status and recovers a completed result. No blind POST
   or repeated model execution follows timeout. Failed/uncertain/expired requires
   operator investigation. Validate the real E2E path after authorized deployment.

OS must precede Live. An old OS does not implement the status endpoint, and Live
fails closed on its 404 unless the exact `DOCUMENT_OPERATION_NOT_FOUND` code is
present. For rollback, roll back Live first. Keep the additive table and deployed
OS available to finish/retrieve in-flight operations; never drop/truncate the
registry. Reverting OS too early would lose recovery, although tombstones remain.

## Local validation

No production database or credentials are needed. PostgreSQL integration uses
an explicitly named disposable container with no network or published port:

```sh
docker run --rm -d --name clara-document-registry-test --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17
# Wait until docker exec clara-document-registry-test pg_isready -U postgres succeeds.
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test node --import tsx --test src/tests/document-operations-postgres.test.ts src/tests/external-event-message-contract.test.ts src/tests/clara-live-product-auth.test.ts src/tests/external-capability-gateway.test.ts
node_modules/.bin/tsc --noEmit --incremental false --pretty false
node_modules/.bin/eslint src/lib/external-capabilities/document-operations.ts src/app/api/external/events/route.ts src/app/api/external/document-operations/status/route.ts src/tests/document-operations-postgres.test.ts src/tests/external-event-message-contract.test.ts
docker stop clara-document-registry-test
```

The integration test applies the actual migration twice, performs twelve
concurrent reservations using independent PostgreSQL connections, and verifies
fencing, uncertainty, immutable recovery, scoped access and expiry. Its TRUNCATE
is confined to that explicit disposable test container, never DATABASE_URL.
The documentary route fixture was emitted by Live's real instruction, source
segmenter and `ClaraCoreEvent.wire_payload`, with synthetic source content.

## Neon validation and PR #161 / PR #274 rollout

See [the controlled Neon procedure](document-operations-neon-rollout.md) for
TEST-branch SQL validation with rollback, real HTTP/PostgreSQL recovery testing,
maintenance prerequisites and exact authorized production rollout. The checked-in
purge procedure and a daily authenticated Vercel Cron are prepared, not activated
in production. The Pro plan is administrator-confirmed; actual project quota,
credential presence, packaged SQL asset and schedule execution remain to verify.
See [daily purge activation](document-operations-daily-purge.md). Daily active-row
cleanup may lag API expiry by up to 24 hours, and MVCC/backup history follows
existing retention policy.
