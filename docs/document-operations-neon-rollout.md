# Validation and controlled rollout — PR #161 / PR #274

No production action is authorized by this document. Keep both PRs unmerged until
explicit human approval. Git production bases remain OS
`consolidation/clara-os-clean-base` and Live `deploy/clara-live-api`; Neon branch
`main` is a database branch, not either Git `main` branch.

## Evidence and limits

Local tests use PostgreSQL 17 in disposable Docker container
`clara-document-registry-test` (`--network none`, no published database port).
The registry/API/real HTTP recovery tests use its local `postgres` database. The
Neon-console SQL procedure is also run on its local `neondb` database with full
rollback. **Neither database is hosted on Neon.** No Neon connection or secret
is read. The administrator reports migration 005 already validated on Neon
`neondb`, branch `test/document-operations-005`, parent `main`, expiry 2026-10-16.
The administrator also confirms the synthetic SQL transaction passed on that
TEST branch. This does not establish that our local API/E2E tests ran on Neon.

The cross-repository test uses the actual OS routes, actual PostgreSQL registry,
actual Live HTTP client and Work Cycle. OS cognition/session saving and Live
Mongo storage use synthetic test boundaries. A one-second test-only HTTP deadline
forces ReadTimeout while OS is blocked at document analysis; production's
20-second deadline is unchanged. Releasing the existing invocation persists the
result; a new Work Cycle/client retrieves it once. It checks conflict/auth/scope,
API expiry, no second analysis/checkpoint write, deferred operator message and
unchanged deterministic 17-input/6-output calculation. No production document or
ORIGINS data is accessed. Mongo's real write concern/index behavior and deployed
Vercel/Neon E2E still need staging/authorized deployment validation.

## Console Neon: functional validation on the TEST branch only

1. In the existing Neon project, select **branch `test/document-operations-005`**
   and **database `neondb`** in the SQL editor. Verify parent `main` and expiry
   2026-10-16 from branch metadata. An administrator records branch/database names
   and test time only; do not share an endpoint credential/connection string.
   `current_database()` confirms a database name, **not the Neon branch**.
2. Run these read-only schema/extension checks. They reveal no source/result/token:

```sql
SELECT current_database() AS database_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clara_document_operations'
ORDER BY ordinal_position;
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.clara_document_operations'::regclass;
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'clara_document_operations';
SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
```

3. Execute `db/validation/document_operations_005_synthetic.sql` **as a whole**
   in that editor session. It requires `neondb`, creates a fresh synthetic scope,
   checks first reservation/duplicate/conflict fingerprint preservation,
   completed-result/seven-day retention constraints, foreign scope, failure states
   and expiry purge preserving a fresh result/tombstones; finally `ROLLBACK`.
   It neither reruns the migration nor persists fixtures. If it errors, execute
   `ROLLBACK;` in the same session before further work. Expected notice:
   `Synthetic registry checks passed. Writes will be rolled back.`
4. This SQL does not prove HTTP behavior or true concurrency on Neon. Those are
   exercised locally with actual PostgreSQL/HTTP, including twelve concurrent
   reservations. For an optional Neon concurrency check, use the two-session
   procedure below on the verified TEST branch. No cloud API test is claimed
   until the reviewed OS and Live are deployed on the intended targets.

### Optional Neon concurrency, two sessions on TEST only

Before starting, check that this synthetic pair is unused; if the count is not
zero, STOP and choose another synthetic pair in both snippets. Never delete an
existing tombstone:

```sql
SELECT count(*) AS existing_synthetic_pair FROM clara_document_operations
WHERE scope_key = repeat('f', 64) AND operation_id = repeat('9', 64);
```

Session A, submit the INSERT and leave this transaction open briefly:

```sql
BEGIN;
INSERT INTO clara_document_operations
  (scope_key, operation_id, fingerprint, owner_token, status)
VALUES (repeat('f',64), repeat('9',64), repeat('8',64), gen_random_uuid(), 'processing')
ON CONFLICT (scope_key, operation_id) DO NOTHING RETURNING operation_id;
```

Session B, while A is open:

```sql
BEGIN;
SET LOCAL lock_timeout = '30s';
INSERT INTO clara_document_operations
  (scope_key, operation_id, fingerprint, owner_token, status)
VALUES (repeat('f',64), repeat('9',64), repeat('8',64), gen_random_uuid(), 'processing')
ON CONFLICT (scope_key, operation_id) DO NOTHING RETURNING operation_id;
```

B must wait. In A execute `COMMIT;` before 30 seconds elapse. A returned one row;
B now returns zero rows. Execute `ROLLBACK;` in B. Verify count = 1 for this pair.
This intentionally leaves one synthetic reservation on the expiring TEST branch,
with no document result. It executes no Core/analysis and does not run on main.
If either session errors, roll it back and report the failure; do not bypass
locks/ownership or launch an analysis. The existing branch expiry disposes of the
test branch according to the administrator's policy.

## Retention and maintenance

Results are readable for seven days after completion. API lookup clears/rejects
expired JSON; old IDs remain reserved by minimal tombstones. Physical active-row
cleanup of *unread* expired results requires a daily execution of
`db/maintenance/purge_document_operations.sql`. It changes only
`status='completed' AND expires_at <= clock_timestamp()` to `expired/result=NULL`,
returns a count, preserves fresh/processing/failed/uncertain rows and is repeatable.
There is no DELETE/TRUNCATE of operations. Never delete tombstones to permit reruns.

The existing `.github/workflows/neon-preview-cleanup.yml` deletes preview branches
on PR closure; it does not purge result JSON. No pre-existing daily SQL runner
was verified. PR #161 now prepares a daily Vercel Cron on the existing OS project
(plan Pro confirmed by the administrator), authenticated with the existing
`CRON_SECRET` mechanism. See [daily purge activation](document-operations-daily-purge.md).
No scheduler or secret has been activated/changed in production. Validate project
quota, enabled state, credential presence and deployed SQL asset before activation.
Neon `pg_cron` is not assumed active or installed; avoid duplicate scheduling.

With daily maintenance, active-row JSON may remain up to 24 hours past the
seven-day API cutoff. Nulling active-row JSON is not immediate erasure of all
MVCC/TOAST versions, Neon history or backups. Reclamation/backup retention follows
existing PostgreSQL/Neon policy; an administrator must validate that policy. No
VACUUM FULL, backup deletion or production purge is performed by this patch.

## Exact rollout order, AFTER explicit authorization

### OS

1. Administrator verifies the existing Neon project, **production DB branch
   `main`**, database `neondb`, retention/restore window and a recoverable point
   before migration. Verify restore capability using existing approved procedures;
   do not copy production documents or expose database credentials. Record deployed
   OS/Live commit IDs and validate the prepared daily Vercel Cron prerequisites
   in `docs/document-operations-daily-purge.md`.
2. Apply the reviewed `db/migrations/005_document_operations.sql` in the secured
   SQL editor for production `main/neondb`, **only after migration approval**.
   Execute the entire transactional file. On error, `ROLLBACK;` and stop.
   No app import/build applies migrations. Existing tables remain unchanged.
3. Run the read-only schema queries above: nine columns, composite primary key
   `(scope_key, operation_id)`, three 64-hex checks, five statuses, result/expiry
   consistency checks and `clara_document_operations_expiry_idx` must match.
4. Validate daily purge authorization, actual execution path and retention policy.
   The purge SQL has local expired/fresh/in-flight/tombstone tests; the TEST-branch
   console procedure checks its predicate without persisting synthetic data.
   Any production purge/scheduler activation needs its own explicit authorization.
5. After merge/deployment authorization, merge PR #161 into
   `consolidation/clara-os-clean-base`, deploy OS on the existing production target.
   No Vercel variable, product JSON, token, Brain or permission change is required.
6. On a new **synthetic** project/scope, verify valid authentication (empty grants),
   submit/status, repeat same ID without additional dispatch, changed-body 409,
   invalid token 401 and foreign user/project/session/product denial. Record only
   correlation/operation metadata, phase duration, HTTP status and test verdicts.
   Never log result text/documents/credentials. Confirm other products/legacy
   consumers remain healthy. Stop if the registry is unavailable or incompatible.

### Live

1. Only after OS acceptance, authorize merge PR #274 into `deploy/clara-live-api`
   and deployment of the existing Live API and frontend change.
2. Use a synthetic dossier and existing Work Cycle. Observe an operation ID
   persisted before submission. If a test encounters ReadTimeout, verify pending
   state, refresh/load state, then use the existing explicit cycle action.
3. Confirm completed result recovery with identical ID, one OS analysis, one
   completed local checkpoint, retained operator message and unchanged calculation
   totals. A refreshed browser alone reads state; the explicit cycle retrieves
   results. Do not repeatedly submit or change the ID to force analysis.
4. If no deployed test actually crosses the HTTP deadline, report nominal E2E
   only; do not label production timeout recovery proven. The local controlled
   HTTP test covers that path without changing production timeouts.

### Business and rollback

Resume ORIGINS OF NEBULAE only after separate explicit authorization. No migration
or validation here modifies its documents/calculations/checkpoints.
For rollback, revert Live first; keep OS's table/status endpoint available for
in-flight operations. Never drop the registry or reset failed/uncertain/expired
operations. If execution dies before its durable result write, the operation is
uncertain: investigate, do not silently reanalyze. Pause activation on absent
backup evidence, failed Neon validation or unconfirmed daily purge. The administrator
subsequently confirmed TEST-branch synthetic SQL passed; actual production activation
is still subject to the daily-purge checklist.

## Repeatable local commands

Run OS's documented PostgreSQL suite first. Do not run its fixture TRUNCATE while
an HTTP test is in flight. Then in the OS checkout start the test-only fixture:

```sh
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test node --import tsx src/tests/helpers/document-operation-test-server.ts
```

It prints only a loopback origin. In a second terminal, from Live, use that origin:

```sh
DOCUMENT_OPERATION_TEST_ORIGIN=http://127.0.0.1:<printed-port> MONGO_URL=mongodb://127.0.0.1:27017 DB_NAME=clara_document_unit PYTHONPATH=backend python -m pytest backend/tests/test_document_operations_postgres_e2e.py -q -n 0
```

Only loopback HTTP is accepted. The fixture cannot read DATABASE_URL or connect
to Neon; all SQL goes to the explicitly named Docker test container. Its control
routes exist under tests only. Stop the fixture with SIGTERM and stop the Docker
container after validation; neither is a new deployed service. The Neon-console
SQL is separately tested locally on `neondb` with unchanged row count after
rollback. No reusable cloud/Vercel configuration is altered.
