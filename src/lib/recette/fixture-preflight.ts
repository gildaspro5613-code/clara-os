import { recetteDatabase } from './policy';

const capabilityLabels:Record<string,string>={can_connect:'CONNECT neondb',can_use_schema:'USAGE public',
 can_use_language:'USAGE plpgsql',lock_execute:'EXECUTE pg_advisory_xact_lock(bigint)',hash_execute:'EXECUTE hashtext(text)',
 config_execute:'EXECUTE set_config(text,text,boolean)',setting_execute:'EXECUTE current_setting(text)',now_execute:'EXECUTE now()',not_owner:'NO OWNERSHIP of authentication tables'};
const requiredColumns:readonly (readonly [string,string,boolean])[]=[
 ['clara_auth_users','id',true],['clara_auth_workspaces','id',true],
 ['clara_auth_identities','issuer',true],['clara_auth_identities','subject',true],['clara_auth_identities','user_id',true],
 ['clara_workspace_memberships','user_id',true],['clara_workspace_memberships','workspace_id',true],['clara_workspace_memberships','role',true],['clara_workspace_memberships','revoked_at',false],
 ['clara_auth_sessions','token_hash',true],['clara_auth_sessions','user_id',true],['clara_auth_sessions','expires_at',true],['clara_auth_sessions','revoked_at',false],
];
/** Only fixed labels constructed by this module may be exposed in a refusal report. */
export class PreflightRefusal extends Error {
 constructor(code:string,readonly missing:readonly string[]){super(code);}
}
export function assertCloudRecetteContext(env:NodeJS.ProcessEnv){
 recetteDatabase(env);
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='workflow_dispatch')
  throw Error('RECETTE_CLOUD_MANUAL_RUN_REQUIRED');
}

export const fixture = Object.freeze({project:'fragrant-dream-31652403',branch:'br-crimson-feather-b2zr00sf',
 user:'recette-176-fictional-user-v1',workspace:'recette-176-fictional-workspace-v1',
 issuer:'urn:clara:recette:fixture:v1',subject:'fictional-operator-v1',
 client:'recette-176-fictional-client-v1',projectId:'recette-176-fictional-project-v1'});

/** This is an OFFLINE operator fixture, not a sign-in adapter or public API.
 * Never call enrollVerifiedIdentity with fabricated provider claims. */
export type PreflightQuery=(strings:TemplateStringsArray,...values:unknown[])=>Promise<Record<string,unknown>[]>;
export async function preflightRecetteFixture(env:NodeJS.ProcessEnv,query:PreflightQuery,metadataFetch:typeof fetch,onCheck:(check:string)=>void=()=>{}){
 const url=recetteDatabase(env);
 onCheck('isolated_configuration_no_postgres_url');
 if(!env.NEON_API_KEY)throw Error('RECETTE_METADATA_ACCESS_REQUIRED');
 const response=await metadataFetch(`https://console.neon.tech/api/v2/projects/${fixture.project}/endpoints`,{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${env.NEON_API_KEY}`}});
 if(!response.ok)throw Error('RECETTE_ENDPOINT_METADATA_UNAVAILABLE');
 const data=await response.json() as {endpoints?:{host?:string;branch_id?:string}[]};
 if(!Array.isArray(data.endpoints)||data.endpoints.filter(e=>e.host===url.hostname).length!==1||data.endpoints.find(e=>e.host===url.hostname)?.branch_id!==fixture.branch)
  throw Error('RECETTE_ENDPOINT_BRANCH_UNPROVEN');
 onCheck('endpoint_branch');
 const roles=await query`SELECT current_database() AS db,current_user AS role,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,
  has_schema_privilege(current_user,'public','CREATE') AS schema_create,
  has_database_privilege(current_user,current_database(),'CREATE') AS database_create
  FROM pg_roles WHERE rolname=current_user`;
 const role=roles[0];
 if(!role||role.db!=='neondb'||role.role!=='clara_os_recette_limited'||
  ['rolsuper','rolbypassrls','rolcreatedb','rolcreaterole','rolreplication','schema_create','database_create'].some(k=>role[k]!==false))
  throw Error('RECETTE_PROVISIONING_ROLE_REFUSED');
 onCheck('database_role_no_admin_or_create');
 // DO uses plpgsql; the lock and transaction-local GUCs need function EXECUTE.
 // Never compensate missing grants or ownership with an administrative connection.
 const capabilities=await query`SELECT
  has_database_privilege(current_user,current_database(),'CONNECT') AS can_connect,
  has_schema_privilege(current_user,'public','USAGE') AS can_use_schema,
  has_language_privilege(current_user,'plpgsql','USAGE') AS can_use_language,
  has_function_privilege(current_user,'pg_catalog.pg_advisory_xact_lock(bigint)','EXECUTE') AS lock_execute,
  has_function_privilege(current_user,'pg_catalog.hashtext(text)','EXECUTE') AS hash_execute,
  has_function_privilege(current_user,'pg_catalog.set_config(text,text,boolean)','EXECUTE') AS config_execute,
  has_function_privilege(current_user,'pg_catalog.current_setting(text)','EXECUTE') AS setting_execute,
  has_function_privilege(current_user,'pg_catalog.now()','EXECUTE') AS now_execute,
  NOT EXISTS(SELECT 1 FROM pg_class WHERE oid IN
   ('public.clara_auth_users'::regclass,'public.clara_auth_workspaces'::regclass,
    'public.clara_auth_identities'::regclass,'public.clara_workspace_memberships'::regclass,
    'public.clara_auth_sessions'::regclass) AND pg_has_role(current_user,relowner,'USAGE')) AS not_owner`;
 if(!capabilities[0]||Object.keys(capabilityLabels).some(key=>capabilities[0][key]!==true))
  throw new PreflightRefusal('RECETTE_PROVISIONING_CAPABILITIES_REQUIRED',Object.keys(capabilityLabels).filter(k=>capabilities[0]?.[k]!==true).map(k=>capabilityLabels[k]));
 onCheck('schema_language_functions_ownership');
 const permissions=await query`SELECT name,col,
  has_column_privilege(current_user,to_regclass('public.'||name),col,'SELECT') AS can_read,
  CASE WHEN writes THEN has_column_privilege(current_user,to_regclass('public.'||name),col,'INSERT') ELSE true END AS can_insert
  FROM (VALUES ('clara_auth_users','id',true),('clara_auth_workspaces','id',true),
   ('clara_auth_identities','issuer',true),('clara_auth_identities','subject',true),('clara_auth_identities','user_id',true),
   ('clara_workspace_memberships','user_id',true),('clara_workspace_memberships','workspace_id',true),('clara_workspace_memberships','role',true),('clara_workspace_memberships','revoked_at',false),
   ('clara_auth_sessions','token_hash',true),('clara_auth_sessions','user_id',true),('clara_auth_sessions','expires_at',true),('clara_auth_sessions','revoked_at',false)) AS required(name,col,writes)
 `;
 const missing=requiredColumns.flatMap(([name,col,writes])=>{
  const matching=permissions.filter(p=>p.name===name&&p.col===col);
  const p=matching.length===1?matching[0]:undefined;
  return [...(p?.can_read===true?[]:[`SELECT public.${name}.${col}`]),
   ...(writes&&p?.can_insert!==true?[`INSERT public.${name}.${col}`]:[])];
 });
 if(missing.length||permissions.length!==requiredColumns.length)
  throw new PreflightRefusal('RECETTE_PROVISIONING_PRIVILEGES_REQUIRED',missing);
 onCheck('five_tables_column_permissions');
 return {status:'PRECHECK_PASSED',checks:['endpoint_branch','database_role','no_admin_or_create','schema_language_functions_ownership','five_tables_column_permissions'],writesExecuted:false} as const;
}

