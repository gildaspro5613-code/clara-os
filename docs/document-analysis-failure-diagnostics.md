# Documentary HTTP 500 — targeted correction and evidence

## What is established

Production correlation `0f9b37b36b1b48088a08acdc001a42a7` failed during document
analysis on 2026-10-09 at 17:49:51 UTC (19:49:51 Europe/Paris). The supplied logs
establish the phase and HTTP 500, not the provider response or failure category.
No production request/document/credential was read or retried.

The production code asks for 6,000 output tokens but the Responses connector
clamps every call to 2,000. It reports `success=true` even for provider status
`incomplete`, drops the incomplete reason and collapses invalid JSON/provider
errors into a generic unavailable-analysis exception. A token-limited JSON can
therefore fail without an actionable diagnostic. The regression test fails on
the original connector (`2000 !== 6000`) and passes with this change. This proves
the budget mismatch; it does not prove the incident was token truncation.

## Minimal change

An internal `document_analysis` output profile honors the existing requested
6,000-token budget. Other callers keep 1,200 default / 2,000 maximum. No model,
provider, timeout, retry policy, authorization, SQL schema or result retrieval
contract changes. More output may increase cost/duration; the durable registry
still handles a result completing after Live's read timeout. It is not a guarantee
that every analysis completes or that 6,000 tokens cannot be exhausted.

The connector exposes additive allowlisted response status, incomplete reason,
output-token count, provider HTTP status and SDK exception category. The route
rejects incomplete, failed, empty, invalid JSON and missing top-level analysis
arrays with real HTTP 500 rather than saving an empty successful analysis. It
preserves tolerant filtering of individual entities/facts. Errors persist as
`failed` under the existing registry; the same operation never gains a new owner.

Correlated `processing_failed` logs contain only `failure_category` and available
numeric segment count, prompt characters, output tokens, requested budget and
provider HTTP status. Categories distinguish truncation, content filter, provider
incomplete/failed/auth/rate limit/timeout/connection/server/request/unknown,
empty output, invalid JSON/structure, missing segments and unexpected exceptions.
Raw exceptions, response content, prompts, document locators, SDK messages,
credentials, provider IDs and project/user identifiers are not logged.

## Dependencies and limits inspected

The route uses the existing OpenAI Responses SDK and model configuration, takes
at most 250 segments, and asks for JSON via the prompt (no structured-output
schema guarantee). Output sanitation caps entities/facts but cannot repair
truncated JSON. The connector had an unused prompt-length constant, not an
enforced input bound. This patch does not introduce a new arbitrary input limit.
The installed SDK defaults to a ten-minute timeout and two retries; neither is
changed. The 18,956-ms phase alone cannot establish an SDK timeout, rate limit,
filter, model failure, malformed output or platform interruption. These require
the new failure category/provider metadata from an authorized synthetic test.

## Verification

- Original connector + regression test: FAIL, actual 2,000 vs requested 6,000.
- Patched OS targeted suite: 40 PASS, 0 FAIL, 0 SKIP, including real PostgreSQL
  migration/reservation/concurrency/fencing/purge, auth/isolation, stored failure
  without duplicate execution, provider-category mapping and safe logging.
- Existing Live PR #274 E2E: real loopback HTTP + isolated PostgreSQL;
  timeout, completed result recovery in a fresh Work Cycle, one analysis and one
  checkpoint, conflict/auth/scope/expiry and deterministic 17/6 assertions.
- TypeScript and targeted ESLint must pass before publication.

The SDK fixture substitutes only the external provider; cognition and Live Mongo
are simulated in E2E. No paid provider call or deployed Vercel behavior is
claimed. No production data, Neon, secrets, ORIGINS retry, PR #275, merge or
deployment is touched. After approval, deploy OS only, then validate with an
explicitly authorized synthetic operation. Do not reissue the failed ORIGINS
operation or delete its reservation to force another analysis.
