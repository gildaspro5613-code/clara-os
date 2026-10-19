import {neon} from '@neondatabase/serverless';

const projectId='prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz';
const branchId='br-crimson-feather-b2zr00sf';
const neonProject='fragrant-dream-31652403';
class Refused extends Error {}
class Unavailable extends Error {}
/** Operator-only read check in a trusted context with effective runtime bindings.
 * Never expose this as an HTTP route or inject control-plane keys into the app.
 * Reports contain fixed labels only, never identifiers, URLs, hashes or errors. */
export async function attestRecetteRuntime(env:NodeJS.ProcessEnv,approvedSha:string,http:typeof fetch=fetch){
 const checks:string[]=[];
 try{
  if(!/^[a-f0-9]{40}$/.test(approvedSha))throw new Unavailable();
  const required=['VERCEL_PROJECT_ID','VERCEL_DEPLOYMENT_ID','VERCEL_TARGET_ENV','CLARA_RECETTE_MODE',
   'CLARA_RECETTE_NEON_BRANCH_ID','CLARA_RECETTE_NEON_HOST','DATABASE_URL','VERCEL_TOKEN','NEON_API_KEY'];
  if(required.some(k=>!env[k]))throw new Unavailable();
  if(env.VERCEL_PROJECT_ID!==projectId||env.VERCEL_TARGET_ENV!=='clara-os-recette'||env.VERCEL_ENV==='production'||
   env.CLARA_RECETTE_MODE!=='isolated-v1'||env.CLARA_RECETTE_NEON_BRANCH_ID!==branchId||env.POSTGRES_URL!==undefined)
   throw new Refused();
  if(!/^dpl_[A-Za-z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID!))throw new Refused();
  let database:URL;try{database=new URL(env.DATABASE_URL!);}catch{throw new Refused();}
  if(!['postgres:','postgresql:'].includes(database.protocol)||database.hostname!==env.CLARA_RECETTE_NEON_HOST||
   !/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(database.hostname)||
   database.username!=='clara_os_recette_limited'||database.pathname!=='/neondb'||!database.password||database.hash||
   (database.port&&database.port!=='5432')||database.searchParams.getAll('sslmode').length!==1||database.searchParams.get('sslmode')!=='require'||
   [...database.searchParams.keys()].some(k=>!['sslmode','channel_binding'].includes(k))||
   (database.searchParams.has('channel_binding')&&(database.searchParams.getAll('channel_binding').length!==1||database.searchParams.get('channel_binding')!=='require')))
   throw new Refused();
  checks.push('ISOLATION_CONFIGURATION');
  const read=async(url:string,key:string)=>{
   const response=await http(url,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Unavailable();return response.json();
  };
  const deployment=await read(`https://api.vercel.com/v13/deployments/${env.VERCEL_DEPLOYMENT_ID}`,env.VERCEL_TOKEN!);
  const project=await read(`https://api.vercel.com/v9/projects/${projectId}`,env.VERCEL_TOKEN!);
  if(project.id!==projectId||project.name!=='clara-os-recette'||deployment.projectId!==projectId||deployment.target==='production')throw new Refused();
  const custom=deployment.customEnvironment;
  const matching=Array.isArray(project.customEnvironments)?project.customEnvironments.filter((e:{slug?:string})=>e.slug==='clara-os-recette'):[];
  const targetProven=custom?.slug==='clara-os-recette'||(matching.length===1&&matching[0].id===(custom?.id??deployment.customEnvironmentId));
  if(!targetProven)throw new Unavailable(); // no inference from a generic Preview target
  const sha=deployment.gitSource?.sha??deployment.meta?.githubCommitSha;
  if(!sha)throw new Unavailable();if(sha!==approvedSha)throw new Refused();
  checks.push('VERCEL_PROJECT_ENVIRONMENT_SOURCE');
  const metadata=await read(`https://console.neon.tech/api/v2/projects/${neonProject}/endpoints`,env.NEON_API_KEY!);
  if(!Array.isArray(metadata.endpoints))throw new Unavailable();
  const endpoints=metadata.endpoints.filter((e:{host?:string})=>e.host===database.hostname);
  if(endpoints.length!==1||endpoints[0].branch_id!==branchId)throw new Refused();
  checks.push('NEON_ENDPOINT_BRANCH'); // only now is any SQL connection attempted
  const sql=neon(env.DATABASE_URL!,{fetchOptions:{redirect:'error',signal:AbortSignal.timeout(15000)}});
  const [rows]=await sql.transaction([sql`SELECT current_database() AS db,current_user AS role,
   rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,
   has_schema_privilege(current_user,'public','CREATE') AS schema_create,
   has_database_privilege(current_user,current_database(),'CREATE') AS database_create
   FROM pg_roles WHERE rolname=current_user`],{readOnly:true});
  const role=rows[0];
  if(rows.length!==1||role.db!=='neondb'||role.role!=='clara_os_recette_limited'||
   ['rolsuper','rolbypassrls','rolcreatedb','rolcreaterole','rolreplication','schema_create','database_create'].some(k=>role[k]!==false))throw new Refused();
  checks.push('SQL_DATABASE_LIMITED_ROLE_NO_ADMIN');
  return {status:'PASS',checks,writesRequested:false} as const;
 }catch(error){return {status:error instanceof Refused?'FAIL':'NON ATTESTÉ',checks,writesRequested:false} as const;}
}
