-- Daily maintenance, not a migration. Execute only on an explicitly verified
-- target and with human authorization. No scheduler is installed by this file.
-- Clears active-row JSON only for expired completed results. Never removes the
-- reservation/fingerprint tombstone or changes non-expired/in-flight operations.
BEGIN;
WITH expired AS (
  UPDATE clara_document_operations
  SET status = 'expired', result = NULL, updated_at = clock_timestamp()
  WHERE status = 'completed' AND expires_at <= clock_timestamp()
  RETURNING 1
)
SELECT count(*) AS expired_results_cleared FROM expired;
COMMIT;
