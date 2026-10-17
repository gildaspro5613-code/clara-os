/** Read-only operator entrypoint. No seed, session issuer, filesystem or deployment imports. */
import {neon} from '@neondatabase/serverless';
import {assertCloudRecetteContext,fixture,preflightRecetteFixture,PreflightRefusal} from './fixture-preflight';

const safeCodes=new Set(['RECETTE_DATABASE_REFUSED','RECETTE_CONFIGURATION_REFUSED',
 'RECETTE_CLOUD_MANUAL_RUN_REQUIRED','RECETTE_METADATA_ACCESS_REQUIRED','RECETTE_ENDPOINT_METADATA_UNAVAILABLE',
 'RECETTE_ENDPOINT_BRANCH_UNPROVEN','RECETTE_PROVISIONING_ROLE_REFUSED','RECETTE_PROVISIONING_CAPABILITIES_REQUIRED',
 'RECETTE_PROVISIONING_PRIVILEGES_REQUIRED','RECETTE_API_KEY_PERMISSION_REVIEW_REQUIRED',
 'RECETTE_SESSION_SECRET_FORBIDDEN','RECETTE_CHECK_ONLY_ARGUMENTS_REQUIRED']);

export async function runCloudPreflight(env:NodeJS.ProcessEnv,args:readonly string[],metadataFetch:typeof fetch=fetch){
 const checks:string[]=[];
 try{
  if(args.length!==2||args[0]!=='--check-cloud'||args[1]!==`--confirm=${fixture.branch}`)
   throw Error('RECETTE_CHECK_ONLY_ARGUMENTS_REQUIRED');
  assertCloudRecetteContext(env);
  if(env.POSTGRES_URL!==undefined)throw Error('RECETTE_DATABASE_REFUSED');
  if(env.RECETTE_FIXTURE_SESSION_TOKEN!==undefined)throw Error('RECETTE_SESSION_SECRET_FORBIDDEN');
  // This is a human attestation, NOT an introspection of the API key. Unknown or
  // write-capable scope requires a separate decision and is not accepted here.
  if(env.NEON_API_KEY_PERMISSION_REVIEW!=='project-read-only-confirmed'||
   env.NEON_API_KEY_REVIEW_PROJECT!==fixture.project)
   throw Error('RECETTE_API_KEY_PERMISSION_REVIEW_REQUIRED');
  checks.push('api_key_permissions_human_attested_not_api_verified');
  const sql=neon(env.DATABASE_URL!,{fetchOptions:{redirect:'error',signal:AbortSignal.timeout(30000)}});
  await preflightRecetteFixture(env,async(strings,...values)=>{
   // Every catalogue query has a server-enforced READ ONLY transaction. Merely
   // setting readOnly on a non-batch neon query would NOT send that header.
   const [rows]=await sql.transaction([sql(strings,...values)],{readOnly:true});
   return rows;
  },metadataFetch,check=>checks.push(check));
  return {status:'PRECHECK_PASSED',checksValidated:checks,missingPrivileges:[],writesExecuted:false,
   apiKeyPermissions:'HUMAN_ATTESTED_ONLY',neonWriteBatch:'NOT_VERIFIED'} as const;
 }catch(error){
  const code=error instanceof Error&&safeCodes.has(error.message)?error.message:'RECETTE_PREFLIGHT_REFUSED';
  return {status:'PRECHECK_REFUSED',code,checksValidated:checks,
   missingPrivileges:error instanceof PreflightRefusal?error.missing:[],writesExecuted:false,
   apiKeyPermissions:'NOT_AUTOMATICALLY_VERIFIED',neonWriteBatch:'NOT_VERIFIED'} as const;
 }
}

