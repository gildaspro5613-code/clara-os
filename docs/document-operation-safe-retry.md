# Coordinated documentary retry — Live issue #276

This companion change is required for Live's explicit operator recovery. It is
based on `consolidation/clara-os-clean-base`, including PR #161 and the documentary
failure diagnostics. No production database/secret/document is touched.

## Contract and proof

`POST /api/external/document-operations/recovery` uses the existing Clara Live
product Bearer authentication and product/scope isolation. Only `clara-live` can
use this protocol; it grants no business capability. Bodies contain action,
parent operation ID and the exact original event; authorization additionally
requires strict `confirm=true`. `inspect` executes SELECT only: it reports an
effective uncertain/expired state without changing a lease or clearing JSON.
It withholds expired results and gives false eligibility on fingerprint mismatch.
Completed/processing/uncertain/expired never authorize. Failed requires result
NULL and exact fingerprint/scope. The server never accepts an actor supplied
separately from the authenticated product's event user.

Migration 006 adds an immutable minimal ledger: scoped parent/child IDs,
fingerprint, operator hash, timestamp, unique parent, and foreign key to the
original operation. A guarded INSERT from a failed parent is idempotent; a
stable SHA-256 child ID is derived from scope+parent. `complete()` cannot finish
from failed, while the old uncertain owner remains allowed to finish. Therefore
failed is a safe terminal predecessor; uncertain and expired are not.

Document retry events add `retryOf`, excluded from the original event fingerprint.
A single guarded INSERT joins authorization and failed parent to reserve the
child; the unique operation key admits exactly one executor. The original record
is never reset/reused. Existing child results/states remain recoverable and never
execute twice. Changed payload for an existing child returns conflict 409.

To prevent bypassing retryOf, new ordinary Clara Live root IDs must equal the
canonical event fingerprint (the existing Work Cycle identity algorithm), and
known authorization-ledger children require their parent. Existing historical
root IDs remain idempotent/readable. Other products retain their ordinary
reservation behavior and cannot use the new retry path. No capability permission,
Brain, commercial route, model, timeout, retry policy or secret is changed.

## Two-store coordination

Live verifies its current source/scope/owned preparation and rejects any completed
root or relevant legacy checkpoint before writing an atomic intent in the existing
Mongo root. OS records the immutable authorization, then Live conditionally stores
the child pointer/audit. A lost reply/finalization leaves a safe blocked intent;
explicit reconciliation reuses the same authorization. This is recoverable
coordination, not a distributed transaction. Authorizing does not start analysis.
The next deliberate Work Cycle consults status and posts the authorized child only
on the existing explicit NOT_FOUND contract. OS remains the sole admission authority.

## Deployment and rollback prerequisites

1. Explicitly review/authorize additive migration 006; validate on isolated TEST,
   backup/restore and database permissions first. NEVER run it on Production from
   this task. Apply 006 BEFORE deploying new OS code: new ordinary Clara Live
   durable reservations also read this ledger and fail closed if it is absent.
2. Authorize/deploy OS before the coordinated Live branch
   `fix/work-cycle-safe-document-recovery` / PR toward `deploy/clara-live-api`.
3. Validate only synthetic failed/status/authorization/duplicate/conflict and
   delayed child recovery. Existing capabilities `[]` and authentication remain.
4. Roll back Live first if needed; keep OS ledger, result retrieval and tombstones
   for existing operations. Do not roll OS back to a version ignoring retryOf
   while new Live remains active. Do not delete/reset rows or restore expired JSON.

No automatic activation, merge, deployment, SQL production execution or ORIGINS
retry is performed. The actual ORIGINS OS/checkpoint state is not remotely
verified; a supplied HTTP 500 does not establish terminal failed state. Its
owner must start with read-only verification after separately authorized rollout.

## Test evidence

40 existing OS targeted tests pass, plus two PostgreSQL recovery tests using
an isolated networkless PostgreSQL 17 container: twelve concurrent authorizations
and reservations, immutable parent/ledger, all states, expired result preservation,
late uncertain completion, exact scope/auth/fingerprint and retry-parent guards.
Both migrations are repeated locally; test fixture cleanup now explicitly clears
both FK-related synthetic tables, never Production.

The companion Live branch has synthetic Mongo/real HTTP + PostgreSQL tests for
explicit decision, lost authorization, timeout recovery, one analysis/checkpoint
and unchanged 17 inputs/6 outputs. Each E2E uses a fresh test-only OS server.
Real Mongo durability and Vercel/Neon deployment remain acceptance checks.

Run the baseline OS PostgreSQL suite BEFORE the recovery suite, not in parallel
with the HTTP fixture (the baseline intentionally clears its synthetic tables):

```sh
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test-recovery node --import tsx --test src/tests/document-operations-postgres.test.ts src/tests/document-operations-purge.test.ts src/tests/external-event-message-contract.test.ts src/tests/clara-live-product-auth.test.ts src/tests/external-capability-gateway.test.ts src/tests/document-analysis-failures.test.ts
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test-recovery node --import tsx --test src/tests/document-operation-recovery-postgres.test.ts
node_modules/.bin/tsc --noEmit --incremental false --pretty false
```

No contents, credentials or raw provider errors are added to logs. Audit metadata
in the ledger is retained alongside existing tombstones; purge changes only
expired completed JSON and leaves the ledger/lineage untouched.
