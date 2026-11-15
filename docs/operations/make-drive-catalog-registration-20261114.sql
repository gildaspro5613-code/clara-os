-- Reviewed provider capability, NOT evidence of a successful user test.
-- Run only after explicit Production delivery authorization and verifying
-- that the Make API onboarding code is deployed on Clara OS.
-- This creates NO connection, NO token, NO client permission and NO scenario run.
-- The same provider-level catalog entry supports future customer accounts.
INSERT INTO clara_connector_builder.read_catalog
  (provider,capability_id,effect,required_scopes,
   contract_revision,enabled,reviewed_by,reviewed_at)
VALUES
  ('make','make.drive.find','READ',
   '["make:scenario:find-drive-document"]'::jsonb,
   1,TRUE,'connector-builder-reviewed-drive-read',NOW())
ON CONFLICT (provider,capability_id) DO NOTHING;
