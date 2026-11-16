-- Compatibility repair after 026 for already provisioned databases.
-- Preserve all four existing job families (007/017/020/026), not a new runtime.
-- Migration role only; never execute at application startup.
BEGIN;
ALTER TABLE clara_external_event_jobs DROP CONSTRAINT IF EXISTS clara_external_event_jobs_job_kind_check;
ALTER TABLE clara_external_event_jobs ADD CONSTRAINT clara_external_event_jobs_job_kind_check
 CHECK(job_kind IN ('external-event','native-chat','native-google','native-document'));
COMMIT;
