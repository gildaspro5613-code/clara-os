# Issue OS #167 — durable external-event execution

## Contract and guarantees

Reference bases: OS `b2456ae15f0449a0649f4de4e1b67945b2f9f0ca` on `consolidation/clara-os-clean-base`; Live `2bb95f19ac9cc010a8dcb7b559c2439a5251cc46` on `deploy/clara-live-api` (includes #281). Coordinated branches: OS `fix/durable-external-event-jobs`, Live `fix/durable-work-cycle-events`.

`POST /api/external/event-jobs` authenticates the existing Bearer / `x-clara-product` credentials, validates the unchanged `clara.unified-core.event.v1` event, and atomically inserts its immutable request and fingerprint under a 64-hex `jobId`. The same ID/body/scope returns the same job; a conflicting fingerprint or scope returns 409. The authenticated OS workspace is part of the scope hash and cannot be overridden by the event workspace. This opt-in route is restricted to Clara Live. Other consumers retain `POST /api/external/events` behavior.

Accepted jobs return 202 and `{success:true,data:{jobId,status,phase,correlationId,result,failureCode,failureCategory,pollAfterSeconds:5}}`. A previously completed job returns 200. `POST /api/external/event-jobs/status` uses the same credentials and complete scope; another user/session/workspace cannot retrieve the job. Unknown IDs return 404. No owner token, request, fingerprint or credential is returned.

PostgreSQL is the queue and source of execution ownership. Next `after()` is only a managed fast notification after acceptance, not the sole executor. The existing Vercel Cron infrastructure provides `/api/internal/event-jobs-run` every minute, authenticated by the existing `CRON_SECRET`. It reconciles pending documentary results, performs retention/uncertainty maintenance and claims one queued job. Failed notification or process death before claim is recoverable from the queue.

An atomic claim plus a partial unique session index permits one cognitive invocation per authenticated session. Ownership is never stolen. Processing older than ten minutes becomes `uncertain`; its original owner can still commit, but no replacement invocation is started. A killed invocation after an external effect and before final persistence cannot safely be replayed: external Brain/provider/callback effects are not covered by a distributed transaction. That ambiguity remains explicit and requires reconciliation evidence. There is **no claim of exactly-once external side effects or unlimited recovery/duration**.

The worker calls the same external-event processor: authentication/configuration checks, dispatch, composition, optional documentary analysis and session persistence. No second Brain, new permission or provider is introduced. Job result and canonical OS session commit in one SQL statement. Lost database acknowledgement cannot turn that completed result into a failure. Documentary operations still use the existing registry and retry authorization: a known failed attempt is never reexecuted. If an existing documentary owner is processing, the job waits on that registry and Cron reconciles its eventual result without dispatching again.

## Live behavior and checkpoints

Work Cycle persists its exact event, job identity and input revision in Mongo before acceptance. Concurrent clicks reuse that checkpoint. The browser keeps a nonsecret 32-hex request receipt in sessionStorage until acknowledged completion; a scoped deterministic job ID also protects response loss after final application. Reusing the current consumed receipt returns its saved result, while an older consumed receipt is rejected (409), never rebuilt or replayed. A lost Mongo reservation/application acknowledgement cannot replace the saved checkpoint with the previous fallback state. A pending turn cannot silently consume a different operator message (409 `CORE_JOB_PENDING`). A lost acceptance response is reconciled by status; explicit resubmission uses the same immutable job ID, never a new attempt.

Live statuses are `core_job_processing`, `core_job_failed`, `core_job_unknown` and `core_job_stale`; successful final states retain the existing Work Cycle meanings, including `continued_with_document_limits`. GET `/api/preparations/{id}/work-cycle/core-job` consults and applies an existing result, without executing a new turn or rerunning calculations. A preparation CAS stores the result/history once; canonical messages use Mongo's unique `_id` and recoverable upserts. Input changes quarantine the retained result instead of applying stale proposals. GET `/work-cycle` excludes the persisted internal event and metadata.

The browser resumes from the persisted job after refresh. It polls GET every five seconds, at most 24 consultations per job/page, then permits explicit status consultation. Polling never POSTs another cognitive turn. Phase-0 continuation requires another explicit operator turn instead of an implicit POST loop. Document dispatch within Work Cycle also uses durable acceptance; legacy direct client consumers keep their synchronous transport. Document results retain their original operation ID and once-only validated documentary checkpoint.

Confirmed documentary failure allows the same OS Brain to work only from confirmed existing business facts, with incomplete documentary analysis and explicit limits. Unknown/uncertain/expired documentary outcomes remain fail-closed. Deterministic calculators are preserved. A transport or provider error is not evidence of a completed deliverable.

## Instrumentation and retention

Acceptance logs measure authentication, validation and job persistence. Processing logs include durable job ID, validated correlation, operation, each phase's duration and exit code/status. Worker invocation end is distinct from durable completion. Live logs acceptance/consultation transport status separately from synthetic errors. No source content, PII, header, token or token fingerprint is logged.

The original Production `b5a118ca63be495381d883bd8ed286bb` call is known to exceed Live's 20-second read deadline, but its slow phase cannot be assigned from the available logs. Future executions expose the needed phase evidence. The initial `unknown_event` during authentication is not an invalid-type verdict.

OS retains queued/completed/failed request/result content for 30 days from acceptance. Minute maintenance clears expired content and retains identity/fingerprint tombstones, preventing reuse of an expired ID. Uncertain content/ownership is never purged automatically; reconcile it under an administrator-approved data-retention decision. Existing OS sessions and Live project checkpoints follow their existing lifecycles; this PR does not erase them.

## Migration and release order — separate authorization required

1. Review both PRs together. Confirm current Production branches, PostgreSQL backup/restore policy, existing `clara_sessions(id,data,updated_at)`, database role privileges, Vercel Pro Cron eligibility, `CRON_SECRET` presence **without reading its value**, and the effective function duration setting. No new secret is required.
2. Validate additive `007_external_event_jobs.sql` on an isolated Neon TEST branch through the administrator's existing secure console. It adds one table and queue/session indexes; it is necessary because the document registry has no queued conversation request/error fields. It does not rewrite or migrate documentary rows. Apply only after separate approval, in a transaction, with a verified backup. No application startup runs DDL.
3. After explicit authorization, apply 007 to the existing Production database. Do not rerun 005/006 or delete old rows. The current PR prepares this SQL; it has only been executed in disposable local PostgreSQL.
4. Deploy OS first. Both acceptance and Cron worker declare `maxDuration=300`. Next documentation confirms `after()` shares the route's platform budget. Actual Vercel plan/Fluid Compute settings, scheduling reliability, cold-start/DB latency and effective duration remain administrator/Production checks; local tests cannot prove them. No arbitrary change to Live's HTTP 20-second limit is made.
5. Verify a synthetic accepted job, durable SQL/session result and authenticated retrieval. Drain older synchronous invocations before cutting Live over; an old HTTP timeout has no new job ID and is not automatically replayed.
6. Deploy Live after OS acceptance/status routes and migration are verified. Verify a synthetic >45-second cycle and refresh recovery, then the separately authorized ORIGINS acceptance sequence below. Merge/deploy/Production migration are not performed by this task.
7. If rollback is necessary, roll back Live first. Retain the additive table and OS status/worker routes to reconcile already accepted jobs. Never drop the queue or reset documentary checkpoints.

## Executed proof and remaining limits

- Live targeted backend suite: 132 PASS, including eleven new checkpoint/transport tests. UI: 19 PASS, including a bounded GET-only refresh poll and explicit failed phase.
- Eight integrated tests use actual OS HTTP routes, PostgreSQL 17 and canonical SQL session persistence; Mongo and cognition/provider responses are simulated. The long Work Cycle and receipt case use real HTTP sockets for both Live and OS. Cases: 46-second Work Cycle and refresh with an existing failed documentary child; lost committed acceptance plus duplicates/conflict/scope/auth; provider failure; lost notification/Cron; actual process kill/restart (queued recovery, processing uncertainty without replay); durable documentary result/checkpoint; Live acceptance loss recovered via GET; consumed request receipts with lost local acknowledgement, replay and changed-message rejection.
- Final long-run evidence: five concurrent clicks accepted in **1061.9 ms**, one composition lasting **46078 ms**, result recovered in **47858.2 ms**, one cognitive execution, no `CORE_TIMEOUT`, no documentary analysis, one history/checkpoint, preserved synthetic 17 inputs / 6 outputs / 40 lights and sources.
- OS authentication/legacy/documentary suites: **35 PASS**. Isolated PostgreSQL registry/queue suite: **8 PASS**, zero skipped (seven database cases plus canonical-fingerprint validation). TypeScript and targeted ESLint: **PASS**. Live checkpoint/single-Brain subset rerun after the final CAS change: 30 PASS.
- Next `typegen` is blocked by a pre-existing SWC native-binding cache ownership/trust failure. A private `/tmp` cache did not solve it. No native verification was disabled; full Next build/type-generation must pass in CI or a correctly configured environment before release.
- Real Mongo replication/write concern, real provider behavior, Vercel scheduler/function termination and actual ORIGINS deliverables remain acceptance checks. No synthetic test is described as a Production success.

## Reproduce locally

Use a **fresh** disposable container per E2E run so unrelated queued jobs cannot consume the single-job Cron ticks:

```sh
docker run --rm -d --name clara-document-registry-test-167 --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17
docker exec clara-document-registry-test-167 pg_isready -U postgres
# From clara-os; existing migrations plus the proposed additive migration:
for migration in db/migrations/005_document_operations.sql db/migrations/006_document_operation_retries.sql db/migrations/007_external_event_jobs.sql; do
  docker exec -i clara-document-registry-test-167 psql -U postgres -v ON_ERROR_STOP=1 < "$migration" || exit
done
# Existing canonical-session schema, only in this synthetic fixture:
docker exec clara-document-registry-test-167 psql -U postgres -v ON_ERROR_STOP=1 -c 'CREATE TABLE clara_sessions(id text PRIMARY KEY,data jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())'
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test-167 node --import tsx src/tests/helpers/event-job-test-server.ts
# From clara-live, use the printed loopback origin:
EVENT_JOB_TEST_ORIGIN=http://127.0.0.1:PORT DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test-167 MONGO_URL=mongodb://127.0.0.1:27017 DB_NAME=clara_document_unit PYTHONPATH=backend /workspace/.onboarding/venv/bin/python -m pytest backend/tests/test_durable_event_jobs_e2e.py -q -n 0 -o junit_family=xunit1 --junitxml=/tmp/clara-167-e2e.xml
```

The test's simulated Mongo URL does not start or connect a real Mongo service. Stop the HTTP fixture before running older PostgreSQL suites, which reset only their disposable documentary tables:

```sh
# From clara-os:
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test-167 node --import tsx --test --test-concurrency=1 src/tests/document-operations-postgres.test.ts src/tests/document-operation-recovery-postgres.test.ts src/tests/event-jobs-postgres.test.ts
node --import tsx --test src/tests/clara-live-product-auth.test.ts src/tests/external-capability-gateway.test.ts src/tests/external-event-message-contract.test.ts src/tests/document-analysis-failures.test.ts src/tests/document-operations-purge.test.ts
node_modules/.bin/tsc --noEmit
node_modules/.bin/eslint src/lib/external-capabilities/event-jobs.ts src/lib/external-capabilities/event-job-worker.ts src/lib/external-capabilities/external-event-handler.ts src/app/api/external/event-jobs/route.ts src/app/api/external/event-jobs/status/route.ts src/app/api/external/events/route.ts src/app/api/internal/event-jobs-run/route.ts src/tests/event-jobs-postgres.test.ts src/tests/helpers/event-job-test-server.ts src/tests/helpers/external-event-route-harness.ts src/tests/helpers/isolated-postgres.ts
# From clara-live/frontend:
CI=true node_modules/.bin/craco test --watch=false --runInBand --moduleNameMapper '{"^@/(.*)$":"<rootDir>/src/$1"}' src/components/ClaraWorkCyclePanel.document-operations.test.jsx
```

Previous synchronous Work Cycle E2E fixtures are not evidence for this new async contract; the eight new actual-HTTP cases are the acceptance suite. Direct synchronous external-event/documentary consumers remain covered by the OS compatibility suites. No skipped test is counted as PASS.

## ORIGINS acceptance, only after authorized release

First inspect the existing root and active documentary IDs: attempt prefix `923386290aa7` must remain failed, without result or new authorization. Do not reimport or dispatch it. Then explicitly invoke one Work Cycle: observe the same durable conversational job across refresh, quick acceptance, progressing phase, final result or precise terminal/uncertain error. Confirm independent Light/Sound/Production work uses the existing facts and that documentary-dependent conclusions remain limited. Check actual produced deliverables separately from validated calculations and proposals. Preserve 17 inputs, 6 outputs, 40 lights, documents and all other facts. This procedure is prepared, not executed on ORIGINS.

The receipt/checkpoint HTTP case was rerun after the final lost-Mongo-ack guard: 1 PASS (same case, not an additional test). The backend suite was rerun on that final code.
