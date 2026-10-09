-- CONSOLE VALIDATION ONLY: select Neon branch test/document-operations-005,
-- database neondb in the console FIRST. current_database() cannot identify a
-- Neon branch. Never execute on main. No migration or scheduler is installed.
-- All synthetic writes are rolled back; output contains no result/credential.
BEGIN;
SELECT current_database() AS database_tested;
DO $$
DECLARE
  synthetic_scope TEXT := encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex');
  operation TEXT := encode(sha256(convert_to('synthetic-operation', 'UTF8')), 'hex');
  fresh_operation TEXT := encode(sha256(convert_to('synthetic-fresh-operation', 'UTF8')), 'hex');
  failed_operation TEXT := encode(sha256(convert_to('synthetic-failed-operation', 'UTF8')), 'hex');
  uncertain_operation TEXT := encode(sha256(convert_to('synthetic-uncertain-operation', 'UTF8')), 'hex');
  expected_fingerprint TEXT := encode(sha256(convert_to('synthetic-body', 'UTF8')), 'hex');
  changed_fingerprint TEXT := encode(sha256(convert_to('different-synthetic-body', 'UTF8')), 'hex');
  owner UUID := gen_random_uuid();
  affected INTEGER;
BEGIN
  IF current_database() <> 'neondb' THEN RAISE EXCEPTION 'Select neondb on the verified Neon TEST branch first.'; END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clara_document_operations') <> 9
    THEN RAISE EXCEPTION 'Expected migrated nine-column registry.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'clara_document_operations' AND indexname = 'clara_document_operations_expiry_idx')
    THEN RAISE EXCEPTION 'Missing expiry index.'; END IF;

  INSERT INTO clara_document_operations (scope_key, operation_id, fingerprint, owner_token, status)
    VALUES (synthetic_scope, operation, expected_fingerprint, owner, 'processing');
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Initial reservation failed.'; END IF;
  INSERT INTO clara_document_operations (scope_key, operation_id, fingerprint, owner_token, status)
    VALUES (synthetic_scope, operation, changed_fingerprint, gen_random_uuid(), 'processing')
    ON CONFLICT (scope_key, operation_id) DO NOTHING;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Duplicate reservation admitted.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM clara_document_operations WHERE scope_key = synthetic_scope AND operation_id = operation AND clara_document_operations.fingerprint = expected_fingerprint AND owner_token = owner)
    THEN RAISE EXCEPTION 'Fingerprint/ownership changed on conflict.'; END IF;
  BEGIN
    UPDATE clara_document_operations SET status = 'completed' WHERE scope_key = synthetic_scope AND operation_id = operation;
    RAISE EXCEPTION 'Missing-result constraint was not enforced.';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE clara_document_operations SET status = 'completed',
    result = '{"response":"synthetic","sessionId":"synthetic-session","structuredResult":{"documentAnalysis":{"schemaVersion":"clara.document-analysis.v1","entities":[],"facts":[],"ambiguities":[],"conflicts":[]}}}'::jsonb,
    updated_at = clock_timestamp(), expires_at = clock_timestamp() + interval '7 days'
    WHERE scope_key = synthetic_scope AND operation_id = operation AND owner_token = owner AND status IN ('processing', 'uncertain');
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Completion failed.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM clara_document_operations WHERE scope_key = synthetic_scope AND operation_id = operation AND status = 'completed' AND result IS NOT NULL AND expires_at > clock_timestamp() + interval '6 days 23 hours')
    THEN RAISE EXCEPTION 'Seven-day result retention failed.'; END IF;
  IF EXISTS (SELECT 1 FROM clara_document_operations WHERE scope_key = repeat('0', 64) AND operation_id = operation AND owner_token = owner)
    THEN RAISE EXCEPTION 'Foreign scope returned an operation.'; END IF;
  INSERT INTO clara_document_operations (scope_key, operation_id, fingerprint, owner_token, status, result, expires_at)
    SELECT synthetic_scope, fresh_operation, expected_fingerprint, gen_random_uuid(), 'completed', result, expires_at
    FROM clara_document_operations WHERE scope_key = synthetic_scope AND operation_id = operation;
  INSERT INTO clara_document_operations (scope_key, operation_id, fingerprint, owner_token, status)
    VALUES (synthetic_scope, failed_operation, expected_fingerprint, gen_random_uuid(), 'failed'),
           (synthetic_scope, uncertain_operation, expected_fingerprint, gen_random_uuid(), 'uncertain');
  UPDATE clara_document_operations SET expires_at = clock_timestamp() - interval '1 second'
    WHERE scope_key = synthetic_scope AND operation_id = operation;
  -- Same purge predicate as daily maintenance, restricted to this synthetic
  -- scope so even other rows on the TEST branch are left untouched.
  UPDATE clara_document_operations SET status = 'expired', result = NULL, updated_at = clock_timestamp()
    WHERE scope_key = synthetic_scope AND status = 'completed' AND expires_at <= clock_timestamp();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Purge touched incorrect rows.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM clara_document_operations WHERE scope_key = synthetic_scope AND operation_id = operation AND status = 'expired' AND result IS NULL AND clara_document_operations.fingerprint = expected_fingerprint)
    THEN RAISE EXCEPTION 'Purge failed to retain tombstone.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM clara_document_operations WHERE scope_key = synthetic_scope AND operation_id = fresh_operation AND status = 'completed' AND result IS NOT NULL)
    THEN RAISE EXCEPTION 'Non-expired result was changed.'; END IF;
  IF (SELECT count(*) FROM clara_document_operations WHERE scope_key = synthetic_scope AND status IN ('failed', 'uncertain')) <> 2
    THEN RAISE EXCEPTION 'Failure states were changed by purge.'; END IF;
  IF (SELECT count(*) FROM clara_document_operations WHERE scope_key = synthetic_scope) <> 4
    THEN RAISE EXCEPTION 'Synthetic rows were deleted.'; END IF;
  RAISE NOTICE 'Synthetic registry checks passed. Writes will be rolled back. HTTP/concurrency are tested separately.';
END $$;
ROLLBACK;
