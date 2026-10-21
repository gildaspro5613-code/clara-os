-- Extend only the approved IONOS mailbox address allowlist. No connection,
-- owner, credentials, delegation or monitoring job is created by this migration.
-- Apply only after 016-020; never infer mailbox ownership from an address.
BEGIN;
ALTER TABLE clara_native_mail_authority
  DROP CONSTRAINT IF EXISTS clara_native_mail_authority_address_check;
ALTER TABLE clara_native_mail_authority
  ADD CONSTRAINT clara_native_mail_authority_address_check
  CHECK (address IN (
    'clara@melodie.digital',
    'gildas@melodie.digital',
    'contact@melodie.digital',
    'info@melodie.digital',
    'support@melodie.digital'
  )) NOT VALID;
ALTER TABLE clara_native_mail_authority
  VALIDATE CONSTRAINT clara_native_mail_authority_address_check;
COMMIT;
