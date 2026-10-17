import { recetteDatabase } from './policy';
import { createOpaqueSessionToken } from '@/lib/auth/authenticated-session-lifecycle';
import { sessionTokenDigest } from '@/lib/auth/authenticated-workspace-session';
import type { NeonQueryFunction } from '@neondatabase/serverless';

export const fixture = Object.freeze({project:'fragrant-dream-31652403',branch:'br-crimson-feather-b2zr00sf',
 user:'recette-176-fictional-user-v1',workspace:'recette-176-fictional-workspace-v1',
 issuer:'urn:clara:recette:fixture:v1',subject:'fictional-operator-v1',
 client:'recette-176-fictional-client-v1',projectId:'recette-176-fictional-project-v1'});

/** This is an OFFLINE operator fixture, not a sign-in adapter or public API.
 * Never call enrollVerifiedIdentity with fabricated provider claims. */
export async function preflightRecetteFixture(env:NodeJS.ProcessEnv,query:NeonQueryFunction<false,false>,metadataFetch:typeof fetch){
 const url=recetteDatabase(env);
 if(!env.NEON_API_KEY)throw Error('RECETTE_METADATA_ACCESS_REQUIRED');
 const response=await metadataFetch(`https://console.neon.tech/api/v2/projects/${fixture.project}/endpoints`,{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${env.NEON_API_KEY}`}});
 if(!response.ok)throw Error('RECETTE_ENDPOINT_METADATA_UNAVAILABLE');
 const data=await response.json() as {endpoints?:{host?:string;branch_id?:string}[]};
 if(!Array.isArray(data.endpoints)||data.endpoints.filter(e=>e.host===url.hostname&&e.branch_id===fixture.branch).length!==1)
  throw Error('RECETTE_ENDPOINT_BRANCH_UNPROVEN');
 const roles=await query`SELECT current_database() AS db,current_user AS role,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,
  has_schema_privilege(current_user,'public','CREATE') AS schema_create,
  has_database_privilege(current_user,current_database(),'CREATE') AS database_create
  FROM pg_roles WHERE rolname=current_user`;
 const role=roles[0];
 if(!role||role.db!=='neondb'||role.role!=='clara_os_recette_limited'||
  ['rolsuper','rolbypassrls','rolcreatedb','rolcreaterole','rolreplication','schema_create','database_create'].some(k=>role[k]!==false))
  throw Error('RECETTE_PROVISIONING_ROLE_REFUSED');
 const permissions=await query`SELECT name,
  bool_and(has_column_privilege(current_user,to_regclass('public.'||name),col,'SELECT')) AS can_read,
  bool_and(CASE WHEN writes THEN has_column_privilege(current_user,to_regclass('public.'||name),col,'INSERT') ELSE true END) AS can_insert
  FROM (VALUES ('clara_auth_users','id',true),('clara_auth_workspaces','id',true),
   ('clara_auth_identities','issuer',true),('clara_auth_identities','subject',true),('clara_auth_identities','user_id',true),
   ('clara_workspace_memberships','user_id',true),('clara_workspace_memberships','workspace_id',true),('clara_workspace_memberships','role',true),('clara_workspace_memberships','revoked_at',false),
   ('clara_auth_sessions','token_hash',true),('clara_auth_sessions','user_id',true),('clara_auth_sessions','expires_at',true),('clara_auth_sessions','revoked_at',false)) AS required(name,col,writes)
  GROUP BY name`;
 if(permissions.length!==5||permissions.some(p=>p.can_read!==true||p.can_insert!==true))
  throw Error('RECETTE_PROVISIONING_PRIVILEGES_REQUIRED');
}

/** Transactional, fixed namespace only. No reassignment, resurrection or schema DDL.
 * The advisory lock serializes this fixture's initializers. Revoked/expired tokens
 * are never renewed, and a second secret file cannot create a parallel live token. */
export function seedRecetteFixture(query:NeonQueryFunction<false,false>,token:string){
 const hash=sessionTokenDigest(token);if(!hash)throw Error('RECETTE_FIXTURE_TOKEN_INVALID');
 return query.transaction([
  query`SELECT pg_advisory_xact_lock(hashtext('clara-recette-fixture-v1'))`,
  query`DO $$ BEGIN
   IF EXISTS(SELECT 1 FROM clara_auth_users WHERE id='recette-176-fictional-user-v1') AND
    (NOT EXISTS(SELECT 1 FROM clara_auth_identities WHERE issuer='urn:clara:recette:fixture:v1' AND subject='fictional-operator-v1' AND user_id='recette-176-fictional-user-v1') OR
     NOT EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE workspace_id='recette-176-fictional-workspace-v1' AND user_id='recette-176-fictional-user-v1' AND role='owner' AND revoked_at IS NULL) OR
     EXISTS(SELECT 1 FROM clara_auth_identities WHERE user_id='recette-176-fictional-user-v1' AND (issuer<>'urn:clara:recette:fixture:v1' OR subject<>'fictional-operator-v1')) OR
     EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE user_id='recette-176-fictional-user-v1' AND workspace_id<>'recette-176-fictional-workspace-v1'))
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_COLLISION'; END IF;
   IF EXISTS(SELECT 1 FROM clara_auth_identities WHERE issuer='urn:clara:recette:fixture:v1' AND subject='fictional-operator-v1' AND user_id<>'recette-176-fictional-user-v1')
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_COLLISION'; END IF;
   IF EXISTS(SELECT 1 FROM clara_auth_workspaces WHERE id='recette-176-fictional-workspace-v1') AND
    (NOT EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE workspace_id='recette-176-fictional-workspace-v1' AND user_id='recette-176-fictional-user-v1' AND role='owner' AND revoked_at IS NULL) OR
     EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE workspace_id='recette-176-fictional-workspace-v1' AND user_id<>'recette-176-fictional-user-v1'))
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_COLLISION'; END IF;
   INSERT INTO clara_auth_users(id) VALUES('recette-176-fictional-user-v1') ON CONFLICT DO NOTHING;
   INSERT INTO clara_auth_workspaces(id) VALUES('recette-176-fictional-workspace-v1') ON CONFLICT DO NOTHING;
   INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('urn:clara:recette:fixture:v1','fictional-operator-v1','recette-176-fictional-user-v1') ON CONFLICT DO NOTHING;
   INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('recette-176-fictional-user-v1','recette-176-fictional-workspace-v1','owner') ON CONFLICT DO NOTHING;
  END $$`,
  query`SELECT set_config('clara.recette.fixture_hash',${hash},true)`,
  query`DO $$ BEGIN
   IF EXISTS(SELECT 1 FROM clara_auth_sessions WHERE token_hash=current_setting('clara.recette.fixture_hash') AND
     (user_id<>'recette-176-fictional-user-v1' OR revoked_at IS NOT NULL OR expires_at<=NOW()))
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_SESSION_UNUSABLE'; END IF;
   IF EXISTS(SELECT 1 FROM clara_auth_sessions WHERE user_id='recette-176-fictional-user-v1' AND token_hash<>current_setting('clara.recette.fixture_hash') AND revoked_at IS NULL AND expires_at>NOW())
    THEN RAISE EXCEPTION 'RECETTE_FIXTURE_SESSION_ALREADY_ACTIVE'; END IF;
  END $$`,
  query`INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at)
   VALUES(${hash},'recette-176-fictional-user-v1',NOW()+INTERVAL '1 hour') ON CONFLICT DO NOTHING`,
 ],{isolationLevel:'Serializable'});
}
export const newRecetteFixtureToken=createOpaqueSessionToken;
