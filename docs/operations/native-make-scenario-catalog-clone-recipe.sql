-- ISOLATED CLONE RECETTE ONLY — not a Production migration.
-- Metadata registration does NOT create a Make connection, credential, grant,
-- executable capability, approval, or Brain tool.
CREATE TABLE IF NOT EXISTS public.clara_native_make_scenario_catalog (
 scenario_key TEXT PRIMARY KEY CHECK (scenario_key ~ '^[a-z][a-z0-9-]{0,119}$'),
 make_scenario_id BIGINT UNIQUE NOT NULL CHECK (make_scenario_id > 0),
 service TEXT NOT NULL,
 effect TEXT NOT NULL CHECK (effect IN ('READ','WRITE','SEND')),
 contract_revision INTEGER NOT NULL DEFAULT 1 CHECK (contract_revision>0),
 input_contract JSONB NOT NULL DEFAULT '{}'::jsonb,
 output_contract JSONB NOT NULL DEFAULT '{}'::jsonb,
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 reviewed_by TEXT,
 reviewed_at TIMESTAMPTZ,
 revoked_at TIMESTAMPTZ,
 CHECK (NOT enabled OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND revoked_at IS NULL))
);
INSERT INTO public.clara_native_make_scenario_catalog
 (scenario_key,make_scenario_id,service,effect) VALUES
 ('find-drive-document',7295042,'google-drive','READ'),
 ('check-calendar-availability',7295055,'google-calendar','READ'),
 ('search-calendar-events',7295113,'google-calendar','READ'),
 ('archive-document',7294781,'google-drive','WRITE'),
 ('create-calendar-event',7294787,'google-calendar','WRITE'),
 ('create-drive-folder',7295842,'google-drive','WRITE'),
 ('move-drive-document',7300737,'google-drive','WRITE'),
 ('sync-brevo-contact',7294540,'brevo','WRITE'),
 ('notify-team',7291299,'brevo','SEND')
ON CONFLICT (scenario_key) DO NOTHING;
REVOKE ALL ON TABLE public.clara_native_make_scenario_catalog FROM PUBLIC;

-- All entries stay disabled until the future authenticated certification command
-- validates input/output contracts, approval provenance and revision.
-- READ grants must join effect='READ', enabled=true, reviewer nonnull,
-- and revoked_at IS NULL. WRITE/SEND never gain native READ authority.
