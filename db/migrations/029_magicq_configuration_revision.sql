-- Additive installation-config revision. No Stage authority or hardware permission.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_connections (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, provider TEXT NOT NULL,
 status TEXT NOT NULL, scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(workspace_id,provider)
);
CREATE TABLE IF NOT EXISTS clara_magicq_connection_configuration (
 connection_id TEXT PRIMARY KEY REFERENCES clara_connections(id) ON DELETE CASCADE,
 host TEXT NOT NULL, port INTEGER NOT NULL DEFAULT 6553,
 fixture_channels JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE clara_magicq_connection_configuration ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;
ALTER TABLE clara_magicq_connection_configuration ADD COLUMN IF NOT EXISTS content_sha256 TEXT;
CREATE OR REPLACE FUNCTION clara_magicq_config_hash(h TEXT,p INTEGER,m JSONB,r BIGINT) RETURNS TEXT
 LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object('host',h,'port',p,'fixtureChannels',m,'revision',r)::text,'UTF8')),'hex')
$$;
-- Initial historical attestation only; malformed legacy rows are still rejected on read.
UPDATE clara_magicq_connection_configuration SET content_sha256=clara_magicq_config_hash(host,port,fixture_channels,revision) WHERE content_sha256 IS NULL;
ALTER TABLE clara_magicq_connection_configuration ALTER COLUMN content_sha256 SET NOT NULL;
CREATE OR REPLACE FUNCTION clara_magicq_configuration(w TEXT,a TEXT,b JSONB) RETURNS JSONB
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE co public.clara_connections; cfg public.clara_magicq_connection_configuration;
 h TEXT; p INTEGER; m JSONB; wanted BIGINT; result JSONB;
BEGIN
 IF w IS NULL OR btrim(w)='' OR a NOT IN ('READ','SAVE') OR jsonb_typeof(b)<>'object' THEN
  RETURN jsonb_build_object('error','MAGICQ_INVALID_REQUEST','status',422); END IF;
 -- Serializes first creation as well as edits; parent row lock serializes revocation.
 PERFORM pg_advisory_xact_lock(hashtextextended('magicq-config:'||w,0));
 SELECT * INTO co FROM public.clara_connections WHERE workspace_id=w AND provider='chamsys.magicq' FOR UPDATE;
 IF b ? 'connectionId' AND (co.id IS NULL OR b->>'connectionId' IS DISTINCT FROM co.id) THEN
  RETURN jsonb_build_object('error','MAGICQ_CONNECTION_NOT_FOUND','status',404); END IF;
 IF co.id IS NOT NULL AND co.status<>'ACTIVE' THEN RETURN jsonb_build_object('error','MAGICQ_CONNECTION_INACTIVE','status',409); END IF;
 IF co.id IS NULL AND a='READ' THEN RETURN jsonb_build_object('configuration',NULL); END IF;
 IF co.id IS NOT NULL THEN
  SELECT * INTO cfg FROM public.clara_magicq_connection_configuration WHERE connection_id=co.id FOR UPDATE;
  IF cfg.connection_id IS NULL OR cfg.revision<1 OR cfg.revision>9007199254740991 OR
   cfg.content_sha256 IS DISTINCT FROM public.clara_magicq_config_hash(cfg.host,cfg.port,cfg.fixture_channels,cfg.revision) THEN
   RETURN jsonb_build_object('error','MAGICQ_CONFIGURATION_INTEGRITY','status',409); END IF;
  h:=cfg.host;p:=cfg.port;m:=cfg.fixture_channels;
 END IF;
 IF a='SAVE' THEN
  IF NOT(b ? 'expectedRevision') AND co.id IS NOT NULL THEN RETURN jsonb_build_object('error','MAGICQ_REVISION_REQUIRED','status',428); END IF;
  IF b ? 'expectedRevision' AND (jsonb_typeof(b->'expectedRevision')<>'number' OR (b->>'expectedRevision') !~ '^[0-9]+$' OR (b->>'expectedRevision')::numeric>9007199254740991) THEN
   RETURN jsonb_build_object('error','MAGICQ_INVALID_REVISION','status',422); END IF;
  wanted:=COALESCE((b->>'expectedRevision')::bigint,0);
  IF wanted<>COALESCE(cfg.revision,0) THEN RETURN jsonb_build_object('error','MAGICQ_REVISION_CONFLICT','status',409); END IF;
  IF jsonb_typeof(b->'host') IS DISTINCT FROM 'string' OR btrim(b->>'host')='' THEN RETURN jsonb_build_object('error','MAGICQ_INVALID_HOST','status',422); END IF;
  h:=btrim(b->>'host');
  IF b ? 'port' THEN
   IF jsonb_typeof(b->'port')<>'number' OR (b->>'port') !~ '^[0-9]+$' OR (b->>'port')::numeric NOT BETWEEN 1 AND 65535 THEN
    RETURN jsonb_build_object('error','MAGICQ_INVALID_PORT','status',422); END IF;
   p:=(b->>'port')::integer;
  ELSE p:=COALESCE(p,6553); END IF;
  IF b ? 'clearMapping' AND jsonb_typeof(b->'clearMapping')<>'boolean' OR b ? 'confirmMapping' AND jsonb_typeof(b->'confirmMapping')<>'boolean' THEN
   RETURN jsonb_build_object('error','MAGICQ_INVALID_MAPPING_INTENT','status',422); END IF;
  IF b->'clearMapping'='true'::jsonb AND b ? 'fixtureChannels' THEN RETURN jsonb_build_object('error','MAGICQ_AMBIGUOUS_MAPPING','status',422); END IF;
  IF b ? 'fixtureChannels' OR b->'clearMapping'='true'::jsonb THEN
   IF b->'confirmMapping' IS DISTINCT FROM 'true'::jsonb THEN RETURN jsonb_build_object('error','MAGICQ_MAPPING_CONFIRMATION_REQUIRED','status',422); END IF;
   IF b->'clearMapping'='true'::jsonb THEN m:='{}'::jsonb;
   ELSE
    IF b->'fixtureChannels'='{}'::jsonb AND COALESCE(m,'{}'::jsonb)<>'{}'::jsonb THEN
     RETURN jsonb_build_object('error','MAGICQ_CLEAR_MAPPING_REQUIRED','status',422); END IF;
    m:=b->'fixtureChannels';
   END IF;
  END IF;
  m:=COALESCE(m,'{}'::jsonb);
 END IF;
 -- Reject corrupted or ambiguous records before returning or persisting anything.
 IF h IS NULL OR h<>btrim(h) OR h='' OR p NOT BETWEEN 1 AND 65535 OR jsonb_typeof(m) IS DISTINCT FROM 'object' THEN
  RETURN jsonb_build_object('error','MAGICQ_CONFIGURATION_INVALID','status',422); END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(m) e WHERE e.key='' OR e.key<>btrim(e.key) OR e.key IN ('__proto__','constructor','prototype') OR jsonb_typeof(e.value)<>'number'
  OR e.value::text !~ '^[0-9]+$') THEN RETURN jsonb_build_object('error','MAGICQ_MAPPING_INVALID','status',422); END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(m) e WHERE (e.value::text)::numeric NOT BETWEEN 1 AND 32769) THEN RETURN jsonb_build_object('error','MAGICQ_MAPPING_INVALID','status',422); END IF;
 IF a='SAVE' THEN
  IF co.id IS NULL THEN
   INSERT INTO public.clara_connections(id,workspace_id,provider,status) VALUES(gen_random_uuid()::text,w,'chamsys.magicq','ACTIVE') RETURNING * INTO co;
   INSERT INTO public.clara_magicq_connection_configuration(connection_id,host,port,fixture_channels,revision,content_sha256)
    VALUES(co.id,h,p,m,1,public.clara_magicq_config_hash(h,p,m,1)) RETURNING * INTO cfg;
  ELSE
   UPDATE public.clara_magicq_connection_configuration SET host=h,port=p,fixture_channels=m,revision=revision+1,
    content_sha256=public.clara_magicq_config_hash(h,p,m,cfg.revision+1),updated_at=clock_timestamp() WHERE connection_id=co.id AND revision=wanted RETURNING * INTO cfg;
   IF NOT FOUND THEN RAISE EXCEPTION 'Concurrent configuration changed'; END IF;
   UPDATE public.clara_connections SET updated_at=clock_timestamp() WHERE id=co.id;
  END IF;
 END IF;
 result:=jsonb_build_object('connectionId',co.id,'provider',co.provider,'host',h,'port',p,'fixtureChannels',m,'revision',cfg.revision,
  'contentSha256',cfg.content_sha256,'status',co.status,'writeCapabilitiesEnabled',false,'physicalCertificationGranted',false);
 RETURN jsonb_build_object('configuration',result);
END $$;
REVOKE ALL ON FUNCTION clara_magicq_configuration(TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_magicq_config_hash(TEXT,INTEGER,JSONB,BIGINT) FROM PUBLIC;
COMMIT;
