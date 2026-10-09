# Daily documentary result purge — PR #161

## Selected mechanism and infrastructure evidence

Use **Vercel Cron on the existing OS project**, once daily, without another
service, connector or dependency. The administrator confirmed the project plan
is **Pro**. Repository inspection found no pre-existing `vercel.json`/cron
schedule. Existing internal OS worker/trace routes authenticate maintenance with
`CRON_SECRET`; this new route uses the same credential and constant-time pattern
without modifying those routes or the commercial workflow.

The existing `.github/workflows/neon-preview-cleanup.yml` deletes preview branches
on PR closure; it is not daily SQL cleanup and is unchanged. Neon `pg_cron` and
external maintenance configuration are not accessible/confirmed. Therefore they
are not assumed active and no database extension/job is installed.

`vercel.json` prepares `0 3 * * *` ->
`GET /api/internal/document-operations-purge` at **03:00 UTC daily** (05:00 Paris
in summer, 04:00 in winter). This is a daily cadence for the confirmed Pro plan;
actual project quota, Cron enabled state, production branch/domain and execution
history still require dashboard verification. The available environment cannot
read the Vercel project; public documentation requests also returned proxy 403.
Do not claim a live cron or verified quota from the file alone. Official provider
references for the activation review:
https://vercel.com/docs/cron-jobs/usage-and-pricing
https://vercel.com/docs/cron-jobs/manage-cron-jobs

## Runtime behavior

- Only exact Bearer authentication against server-side `CRON_SECRET` is accepted.
  Missing/empty configuration, external product tokens, user cookies, query
  parameters or a spoofed Cron User-Agent cannot authorize maintenance. Unauthorized
  calls return 401 before reading/executing SQL. No public fallback exists.
- This credential is already referenced in existing OS code. **No new variable
  name or secret value is introduced.** Production presence is unconfirmed; local
  absence does not establish production absence. Verify presence/status only in
  secured settings. If absent, an administrator must separately authorize/configure
  it securely before activation; never generate/display it in this PR or rotate
  existing secrets. The scheduler's standard Bearer header must match this binding.
- `purgeDocumentOperations()` loads the existing reviewed
  `db/maintenance/purge_document_operations.sql`. It removes only the file's
  transaction wrapper and executes its single atomic UPDATE/CTE through the existing
  lazy Neon SQL client. No caller input enters SQL; unsupported multi-statement
  content fails closed. The file and predicate are unchanged.
- `next.config.ts` explicitly includes that SQL asset in the maintenance route's
  server trace; the route uses Node runtime and no-store/dynamic responses.
- The SQL changes only completed results whose `expires_at` has passed to
  `expired/result=NULL`. Fresh results, processing, failed and uncertain operations
  remain untouched. Existing expired rows remain reserved. Scope/operation ID,
  fingerprint, ownership nonce and timestamps remain: purge never makes an ID
  eligible for a new analysis. There is no DELETE/TRUNCATE of registry/business data.
- Success returns only `success` and `expired_results_cleared`; logs contain a
  generated maintenance run ID, status, duration and cleared count. Errors return
  generic 503 and logs omit exception/SQL, credentials, document contents, scopes
  and per-operation identifiers. No retry or timeout increase is added.

Results stop being readable after seven days; daily cleanup of active JSON may
lag expiry by up to one day. Clearing an active-row JSON column is not instant
erasure of PostgreSQL MVCC/TOAST history or Neon backups: existing reclamation
and backup retention still apply. No VACUUM FULL or backup deletion is performed.

## Activation — explicit authorization required

1. In Vercel, confirm the actual OS project is Pro, its Root Directory is the
   Next.js repository root, its production branch is
   `consolidation/clara-os-clean-base`, Cron is enabled, and a daily job fits the
   current project quota. Compare any existing deployed schedules with the new
   declaration; preserve unrelated jobs if present outside this checkout.
2. Verify only **presence/status** of `CRON_SECRET` and the existing OS database
   binding in the intended production environment. Do not reveal or change an
   existing value. Resolve any missing binding only with separate authorization.
3. Use the already reviewed Neon rollout: backups/restore verification, explicit
   permission for migration 005 on `main/neondb`, and schema/constraint/index
   checks. The administrator reports its TEST-branch migration and synthetic
   BEGIN/DO/ROLLBACK validation passed; no production SQL has run from this task.
4. Review PR #161 and authorize merge/deployment. Until the authorized production
   deployment, this committed declaration does not establish an active schedule.
   Do not add a second pg_cron/GitHub scheduler for the same purge.
5. Validate build packaging: the maintenance route's `.nft.json`/deployed function
   trace must contain `db/maintenance/purge_document_operations.sql`. Without the
   asset or table the route fails safely with 503; never remove auth to debug it.
6. On an explicitly authorized staging/synthetic scope, test expired/fresh/in-flight
   behavior and authenticated/unauthenticated triggers. Use Vercel's secured Cron
   Run control or approved secure tooling; do not paste a secret into terminal
   history, a URL, a report, logs or screenshots. Approve any production test writes
   separately. Never use ORIGINS data.

## Verify after activation

- Confirm the exact path/schedule in Vercel Cron and observe at least one scheduled
  production run in history. A manual successful run alone does not prove daily
  scheduling. Expect HTTP 200 and the count/duration/run-ID log, even count zero.
- Confirm unauthenticated GET receives 401 and cannot purge. A 401 scheduled run
  means maintenance authentication is not configured correctly; stop and investigate.
- Verify synthetic expired row has `status=expired/result IS NULL`, its fingerprint
  remains, a fresh result and in-flight states are unchanged, and repeating the job
  clears zero additional rows. Retrieve only metadata/verdicts, not document JSON.
- Verify the same expired operation cannot acquire ownership again; completed Live
  checkpoints/recovery remain compatible. After OS acceptance, use the separately
  authorized PR #274 rollout. This PR makes no Live file or PR change.
- Investigate generic 503, missing executions or quota/protection failures through
  approved operational controls. No automatic retry is implemented here.

## Rollback

After authorization, disable **only this cron** in Vercel or remove its one entry
and redeploy the previous configuration. Preserve other schedules, `CRON_SECRET`,
other internal routes, migration/table and tombstones. Do not revert the entire
OS recovery registry to undo scheduling. An authorized administrator may use the
existing SQL maintenance file manually during a temporary pause. Never restore
expired JSON or reset/delete a reservation to trigger reanalysis. API expiry
continues, but unattended physical cleanup pauses until scheduling is restored.

## Test evidence and limitations

The targeted OS suite adds authentication/refusal, logging hygiene and exact
SQL reuse checks plus actual PostgreSQL route execution/purge preservation and
repeatability. The unchanged Live E2E test is run against actual OS event/status
routes and the local PostgreSQL registry. Its test-only expiry control now invokes
this authenticated maintenance route with a synthetic credential before checking
API expiry/idempotence, alongside timeout/refresh/single checkpoint and 17/6
synthetic sound totals. OS cognition and Live Mongo remain mocked boundaries;
HTTP and PostgreSQL are real. No Vercel/Neon production endpoint is called.

From OS, while the explicitly isolated Docker fixture is running:

```sh
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test node --import tsx --test src/tests/document-operations-postgres.test.ts src/tests/document-operations-purge.test.ts src/tests/external-event-message-contract.test.ts src/tests/clara-live-product-auth.test.ts src/tests/external-capability-gateway.test.ts
node_modules/.bin/tsc --noEmit --incremental false --pretty false
node_modules/.bin/eslint next.config.ts src/lib/maintenance/document-operations-purge.ts src/app/api/internal/document-operations-purge/route.ts src/tests/document-operations-purge.test.ts src/tests/document-operations-postgres.test.ts src/tests/helpers/document-operations-purge-route-harness.ts src/tests/helpers/document-operation-test-server.ts
```

Then run the existing cross-repository E2E fixture as described in
`document-operations-neon-rollout.md`. Run it on a fresh test server after the SQL
suite completes; stop both test processes afterward. Daily scheduling, quota,
secret presence and serverless asset packaging remain deployment acceptance
checks. No live activation or existing secret/environment change is performed.
