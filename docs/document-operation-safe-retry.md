# Documentary retry — Live issues #276 / #278

## Existing safety contract (#165)

The recovery endpoint authenticates Clara Live with the existing Bearer product
contract. Other products cannot use recovery; business capabilities remain `[]`.
The exact current event scope and fingerprint are required. Inspection performs
SELECT only; it never expires a result, changes a lease or submits an analysis.
Only terminal `failed` with NULL result is eligible for explicit authorization.
`processing`, `uncertain`, `completed`, `expired` and unknown remain fail closed.

Existing migration 006 has one immutable scoped authorization per failed parent,
with deterministic distinct child ID, fingerprint, operator hash and timestamp.
The guarded child reservation grants exactly one executor. Roots, leases and
completed results are never reset/deleted/reused. Existing owners can complete
from uncertain, not failed. Other product/event behavior is preserved.

## Minimal change for #278

Inspection now reads `clara_document_operation_retries` through a scope/parent/
fingerprint join to a terminal failed parent with NULL result. If authority
already exists, the response includes:

```json
{"authorization":{"status":"authorized","parentOperationId":"<parent>","attemptId":"<child>"}}
```

Otherwise authorization is NULL (including fingerprint mismatch). No operator
hash/secret or source text is returned. Reading the authority does not insert an
authorization or reserve the child. Live can therefore reconcile a lost HTTP
acknowledgement or Mongo finalization by committing the SAME pointer locally,
without a new authorization POST. It then inspects the child to distinguish
not-started/processing/completed/fail-closed outcomes. Child results and failed
parents remain durable under the existing registry/retention policy.

Recovery validates/replaces `x-clara-correlation-id` as random-format 32 hex and
returns it with no-store headers. Logs contain action/state/code/status/duration
only. Document analysis exceptions keep real HTTP 500 and additionally expose
`DOCUMENT_ANALYSIS_FAILED` and the already existing failure category. Other Core
errors use `CORE_EVENT_PROCESSING_FAILED`. No raw provider error, document content,
secret or PII is logged or returned by these diagnostics. This is observability,
not a change to the Brain or analysis execution.

## Coordination, rollout and limits

Two-store coordination uses existing atomic SQL and Live checkpoint CAS, not a
distributed transaction. A local pending intent blocks ordinary execution until
OS authority is read and the local pointer/audit confirmed. An intent with no
OS authority cannot create a retry during inspection. Completed checkpoints are
preserved. A later failed child needs its own separate explicit decision.

No new migration is necessary: the operator reports migration 006 applied.
After review and explicit authorization, deploy OS branch
`fix/document-retry-authorization-inspection` to `consolidation/clara-os-clean-base`
FIRST, then Live `fix/document-recovery-reconciliation` to `deploy/clara-live-api`.
No new secret/configuration/capability is required. Roll back Live first if needed;
retain ledger, tombstones and retrieval for existing attempts. Do not run SQL,
merge, deploy or retry ORIGINS as part of this delivery. PR #275 is untouched.

## Executed validation

- 40 baseline OS tests + 2 real PostgreSQL recovery tests PASS.
- Existing authority can be read after simulated lost acknowledgement, with the
  entire SQL ledger unchanged; wrong scope/fingerprint cannot expose it.
- Twelve concurrent authorizations/reservations retain one child and one owner;
  failed parents remain immutable; stale owners/expired results remain safe.
- TypeScript and targeted ESLint PASS.
- Live E2Es execute actual OS HTTP handlers and PostgreSQL with synthetic cognition
  and Mongo: real HTTP response loss, failed Mongo finalization, concurrent decisions,
  completed-child reconciliation, timeout/result recovery, one checkpoint and
  unchanged deterministic 17-input/6-output calculations.

The additional test HTTP server loss switch is loopback-only, test-only and never
part of application routes. PostgreSQL runs in an isolated networkless tmpfs
container. No production credentials, Neon or real ORIGINS data were accessed.
Real Mongo durability, deployed Vercel behavior and ORIGINS final deliverables
remain acceptance checks. See Live `docs/recovery-validation-278.md` for commands.
