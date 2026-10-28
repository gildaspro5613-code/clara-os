import {neon} from '@neondatabase/serverless';
import {validateRecetteDatabaseBinding} from './database-binding';
import {verifyRecetteSqlRole,RecetteSqlIdentityRefused} from './runtime-attestation';

const project='prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz';
const team='team_0BeqOAO8t5oDEBdzHHdekcxv';
const environment='env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM';
const slug='clara-os-recette';
const keys=['DATABASE_URL','CLARA_RECETTE_NEON_HOST','CLARA_RECETTE_NEON_BRANCH_ID','CLARA_RECETTE_MODE'] as const;
class Unavailable extends Error {}
class Refused extends Error {}
export type RecetteAttestationStage = 'CREDENTIALS'|'VERCEL_PROJECT'|'CUSTOM_ENVIRONMENT'|'ENV_LIST'|'ENV_BINDINGS'|'ENV_BINDING_DATABASE_URL'|'ENV_BINDING_NEON_HOST'|'ENV_BINDING_BRANCH_ID'|'ENV_BINDING_MODE'|'DATABASE_BINDING'|'NEON_ENDPOINT'|'SQL_IDENTITY'|'SQL_PERMISSIONS';

/** Operator/Actions only. No route, files, subprocesses, GITHUB_ENV or raw error output.
 * Attests the current configuration for a future deployment, NOT an existing deployment.
 * Requires explicit custom-Environment bindings; inheritance is never guessed. */
export async function attestRecetteEnvironment(input:{vercelToken?:string;neonKey?:string},http:typeof fetch=fetch,onDiagnostic?:(stage:RecetteAttestationStage)=>void):Promise<'PASS'|'FAIL'|'NON ATTESTÉ'>{
 let stage:RecetteAttestationStage='CREDENTIALS';
 const setStage=(next:RecetteAttestationStage)=>{stage=next;};
 try{
  if(!input.vercelToken||!input.neonKey)throw new Unavailable();
  async function read(path:string){
   const url=new URL(path,'https://api.vercel.com');url.searchParams.set('teamId',team);
   const r=await http(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${input.vercelToken}`}});
   if(!r.ok)throw new Unavailable();return r.json();
  }
  setStage('VERCEL_PROJECT');
  const p=await read(`/v9/projects/${project}`);
  if(p.id!==project||p.accountId!==team||p.name!==slug||p.link||p.gitRepository)throw new Refused();
  setStage('CUSTOM_ENVIRONMENT');
  const custom=await read(`/projects/${project}/custom-environments`);
  if(!Array.isArray(custom.environments))throw new Unavailable();
  const matches=custom.environments.filter((e:{id?:string;slug?:string})=>e.id===environment||e.slug===slug);
  if(matches.length!==1||matches[0].id!==environment||matches[0].slug!==slug||
   (matches[0].projectId!==undefined&&matches[0].projectId!==project))throw new Refused();
  // Official API: filter without decryption, then decrypt only the four selected IDs.
  setStage('ENV_LIST');
  const listing=await read(`/v10/projects/${project}/env?customEnvironmentId=${environment}&decrypt=false`);
  if(!Array.isArray(listing.envs)||listing.pagination?.next)throw new Unavailable();
  const rows=listing.envs;
  if(rows.some((e:{key?:string})=>e.key==='POSTGRES_URL'))throw new Refused();
  const env:NodeJS.ProcessEnv={NODE_ENV:'production',VERCEL_PROJECT_ID:project,VERCEL_TARGET_ENV:slug,VERCEL_ENV:'preview'};
  setStage('ENV_BINDINGS');
  for(const key of keys){
   setStage(({DATABASE_URL:'ENV_BINDING_DATABASE_URL',CLARA_RECETTE_NEON_HOST:'ENV_BINDING_NEON_HOST',CLARA_RECETTE_NEON_BRANCH_ID:'ENV_BINDING_BRANCH_ID',CLARA_RECETTE_MODE:'ENV_BINDING_MODE'} as const)[key]);
   const candidates=rows.filter((e:{key?:string})=>e.key===key);
   if(candidates.length!==1)throw new Unavailable();
   const e=candidates[0];
   if(e.target==='production'||(Array.isArray(e.target)&&e.target.includes('production')))throw new Refused();
   if(!e.id||!Array.isArray(e.customEnvironmentIds)||e.customEnvironmentIds.length!==1||e.customEnvironmentIds[0]!==environment||e.gitBranch)throw new Unavailable();
   const value=await read(`/v1/projects/${project}/env/${encodeURIComponent(e.id)}`);
   if(value.id!==e.id||value.key!==key||(value.type!=='plain'&&value.decrypted!==true)||typeof value.value!=='string'||!value.value||
    !Array.isArray(value.customEnvironmentIds)||value.customEnvironmentIds.length!==1||value.customEnvironmentIds[0]!==environment||value.gitBranch)throw new Unavailable();
   if(value.target==='production'||(Array.isArray(value.target)&&value.target.includes('production')))throw new Refused();
   env[key]=value.value;
  }
  // User-defined system-variable overrides must never contradict the proven target.
  for(const [key,value] of Object.entries({VERCEL_PROJECT_ID:project,VERCEL_TARGET_ENV:slug,VERCEL_ENV:'preview'})){
   if(rows.some((e:{key?:string})=>e.key===key))throw new Refused();
   env[key]=value;
  }
  setStage('DATABASE_BINDING');
  const binding=validateRecetteDatabaseBinding(env);
  if(binding==='FAIL')throw new Refused();if(binding!=='OK')throw new Unavailable();
  const database=new URL(env.DATABASE_URL!);
  setStage('NEON_ENDPOINT');
  const response=await http('https://console.neon.tech/api/v2/projects/fragrant-dream-31652403/endpoints',{
   method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${input.neonKey}`}});
  if(!response.ok)throw new Unavailable();
  const metadata=await response.json();if(!Array.isArray(metadata.endpoints))throw new Unavailable();
  const endpoints=metadata.endpoints.filter((e:{host?:string})=>e.host===database.hostname||
   (database.hostname.includes('-pooler.')&&e.host===database.hostname.replace('-pooler.','.')));
  if(endpoints.length!==1||endpoints[0].branch_id!=='br-crimson-feather-b2zr00sf')throw new Refused();
  // No SQL is attempted before project, target, URL and endpoint provenance all pass.
  setStage('SQL_IDENTITY');
  try{await verifyRecetteSqlRole(env.DATABASE_URL!);}catch(e){if(e instanceof RecetteSqlIdentityRefused)throw new Refused();throw new Unavailable();}
  setStage('SQL_PERMISSIONS');
  const sql=neon(env.DATABASE_URL!,{fetchOptions:{redirect:'error',signal:AbortSignal.timeout(15000)}});
  const [results]=await sql.transaction([sql`SELECT
   NOT EXISTS(SELECT 1 FROM pg_roles r WHERE (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication)
    AND pg_has_role(current_user,r.oid,'MEMBER')) AS no_admin_membership,
   has_schema_privilege(current_user,'public','USAGE') AS schema_usage,
   NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname LIKE 'clara_%' AND pg_has_role(current_user,c.relowner,'MEMBER')) AS no_object_ownership,
   NOT EXISTS(SELECT 1 FROM (VALUES
    ('clara_auth_users','SELECT'),('clara_auth_workspaces','SELECT'),('clara_workspace_memberships','SELECT'),
    ('clara_auth_sessions','SELECT'),('clara_auth_sessions','UPDATE'),('clara_auth_identities','SELECT'),
    ('clara_registry_clients','SELECT'),('clara_registry_projects','SELECT'),('clara_registry_client_access','SELECT'),('clara_registry_project_access','SELECT'),
    ('clara_native_resource_authority','SELECT'),('clara_sessions','SELECT'),('clara_sessions','INSERT'),('clara_sessions','UPDATE'),
    ('clara_missions','SELECT'),('clara_missions','INSERT'),('clara_missions','UPDATE'),
    ('clara_native_conversation_messages','SELECT'),('clara_native_conversation_messages','INSERT'),
    ('clara_journal_entries','SELECT'),('clara_journal_entries','INSERT'),('clara_native_journal_scope','SELECT'),('clara_native_journal_scope','INSERT'),
    ('clara_project_intake_inbox','SELECT'),('clara_project_intake_inbox','INSERT'),
    ('clara_registry_audit','SELECT'),('clara_registry_audit','INSERT'),
    ('clara_acquisition_records','SELECT'),('clara_acquisition_records','INSERT'),('clara_acquisition_records','UPDATE'),
    ('clara_connections','SELECT'),('clara_native_mail_authority','SELECT'),('clara_native_mail_delegations','SELECT'),
    ('clara_native_mail_messages','SELECT'),('clara_native_mail_bindings','SELECT'),('clara_native_mail_operations','SELECT'),
    ('clara_native_google_authority','SELECT'),('clara_native_google_delegations','SELECT'),('clara_document_operations','SELECT')
   ) AS required(name,permission) WHERE to_regclass('public.'||name) IS NULL OR NOT COALESCE(has_table_privilege(current_user,to_regclass('public.'||name),permission),false)) AS runtime_table_permissions,
   NOT EXISTS(SELECT 1 FROM (VALUES ('clara_native_read_session'),('clara_native_runtime_command'),('clara_native_chat_command'),
    ('clara_native_document_command'),('clara_native_google_command'),('clara_native_mail_command'),('clara_native_history')) AS required(name)
    WHERE NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=name
     AND has_function_privilege(current_user,p.oid,'EXECUTE') AND NOT p.prosecdef)) AS runtime_function_permissions`],{readOnly:true});
  if(results.length!==1||Object.values(results[0]).some(v=>v!==true)||Object.keys(results[0]).length!==5)throw new Refused();
  return 'PASS';
 }catch(e){onDiagnostic?.(stage);return e instanceof Refused?'FAIL':'NON ATTESTÉ';}
}
