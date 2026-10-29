const stages=new Set(['VERCEL_RECETTE_TOKEN','NEON_API_KEY','VERCEL_PROJECT','VERCEL_CUSTOM_ENVIRONMENT','VERCEL_BINDINGS','VERCEL_DOMAINS','VERCEL_ALIAS','VERCEL_ALIAS_DEPLOYMENT','NEON_ENDPOINTS']);
const kinds=new Set(['MISSING_SECRET','HTTP','TIMEOUT','TRANSPORT','INVALID_JSON']);
export class MetadataAccessUnavailable extends Error {
 constructor(stage,kind,status){super('METADATA_ACCESS_UNAVAILABLE');this.stage=stage;this.kind=kind;this.status=status;}
}
/** Only fixed stage/kind labels and a numeric HTTP status can leave this process. */
export function formatMetadataFailure(error){
 if(error instanceof MetadataAccessUnavailable){
  const stage=stages.has(error.stage)?error.stage:'UNKNOWN';
  const kind=kinds.has(error.kind)?error.kind:'UNKNOWN';
  const status=Number.isInteger(error.status)&&error.status>=100&&error.status<=599?' http='+error.status:'';
  return 'METADATA_ACCESS_UNAVAILABLE stage='+stage+' kind='+kind+status;
 }
 return ['METADATA_REFUSED','PROJECT_DOMAINS_REFUSED','NEON_ENDPOINT_REFUSED','RECEPTION_ALIAS_REFUSED'].includes(error?.message)?error.message:'METADATA_REFUSED';
}
/** No protected value is requested, decrypted, printed or written to disk. */
export async function verifyRecetteMetadata({vercelToken,neonKey,http=fetch}){
 if(!vercelToken)throw new MetadataAccessUnavailable('VERCEL_RECETTE_TOKEN','MISSING_SECRET');
 if(!neonKey)throw new MetadataAccessUnavailable('NEON_API_KEY','MISSING_SECRET');
 const project='prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',team='team_0BeqOAO8t5oDEBdzHHdekcxv',environment='env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM';
 async function readJSON(url,token,stage){
  let response;
  try{response=await http(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token}});}
  catch(error){throw new MetadataAccessUnavailable(stage,['TimeoutError','AbortError'].includes(error?.name)?'TIMEOUT':'TRANSPORT');}
  if(!response.ok)throw new MetadataAccessUnavailable(stage,'HTTP',response.status);
  try{return await response.json();}catch{throw new MetadataAccessUnavailable(stage,'INVALID_JSON');}
 }
 async function read(path,stage){const url=new URL(path,'https://api.vercel.com');url.searchParams.set('teamId',team);return readJSON(url,vercelToken,stage);}
 const p=await read('/v9/projects/'+project,'VERCEL_PROJECT');
 if(p.id!==project||p.accountId!==team||p.name!=='clara-os-recette'||p.link||p.gitRepository)throw Error('METADATA_REFUSED');
 const custom=await read('/projects/'+project+'/custom-environments','VERCEL_CUSTOM_ENVIRONMENT');
 const matches=Array.isArray(custom.environments)?custom.environments.filter(e=>e.id===environment||e.slug==='clara-os-recette'):[];
 if(matches.length!==1||matches[0].id!==environment||matches[0].slug!=='clara-os-recette'||(matches[0].projectId!==undefined&&matches[0].projectId!==project))throw Error('METADATA_REFUSED');
 const bindings=await read('/v10/projects/'+project+'/env?customEnvironmentId='+environment+'&decrypt=false','VERCEL_BINDINGS');
 if(!Array.isArray(bindings.envs)||bindings.pagination?.next)throw Error('METADATA_REFUSED');
 const rows=bindings.envs;
 if(rows.some(e=>['POSTGRES_URL','VERCEL_ENV','VERCEL_PROJECT_ID','VERCEL_TARGET_ENV'].includes(e.key)))throw Error('METADATA_REFUSED');
 for(const key of ['DATABASE_URL','CLARA_RECETTE_NEON_HOST','CLARA_RECETTE_NEON_BRANCH_ID','CLARA_RECETTE_MODE','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','CLARA_AUTH_GOOGLE_REDIRECT_URI','CLARA_AUTH_APP_ORIGIN']){
  const entries=rows.filter(e=>e.key===key);
  if(entries.length!==1||entries[0].gitBranch||!Array.isArray(entries[0].customEnvironmentIds)||entries[0].customEnvironmentIds.length!==1||entries[0].customEnvironmentIds[0]!==environment||
    entries[0].target==='production'||entries[0].target?.includes('production'))throw Error('METADATA_REFUSED');
 }
 const domains=await read('/v9/projects/'+project+'/domains','VERCEL_DOMAINS');
 if(!Array.isArray(domains.domains)||domains.pagination?.next||domains.domains.some(d=>!/^clara-os-recette(?:-[a-z0-9-]+)?\.vercel\.app$/.test(d.name??'')))throw Error('PROJECT_DOMAINS_REFUSED');
 // Resolve the one stable origin; no alias or domain is created/reassigned here.
 const alias=await read('/v4/aliases/clara-os-recette.vercel.app','VERCEL_ALIAS');
 if(alias.alias!=='clara-os-recette.vercel.app'||(alias.projectId!=null&&alias.projectId!==project)||alias.redirect||!/^dpl_[A-Za-z0-9]+$/.test(alias.deploymentId??''))throw Error('RECEPTION_ALIAS_REFUSED');
 const current=await read('/v13/deployments/'+alias.deploymentId,'VERCEL_ALIAS_DEPLOYMENT');
 if(current.id!==alias.deploymentId||current.projectId!==project||current.ownerId!==team||current.target==='production'||current.readyState!=='READY'||
   current.customEnvironment?.id!==environment||current.customEnvironment?.slug!=='clara-os-recette')throw Error('RECEPTION_ALIAS_REFUSED');
 const neon=await readJSON('https://console.neon.tech/api/v2/projects/fragrant-dream-31652403/endpoints',neonKey,'NEON_ENDPOINTS');
 const endpoints=Array.isArray(neon.endpoints)?neon.endpoints.filter(e=>e.host==='ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech'):[];
 if(endpoints.length!==1||endpoints[0].branch_id!=='br-crimson-feather-b2zr00sf')throw Error('NEON_ENDPOINT_REFUSED');
 return 'PASS'; // Metadata only; NOT SQL or effective-value attestation.
}
if(process.argv[1]?.endsWith('/verify-recette-metadata.mjs')){
 try{console.log(await verifyRecetteMetadata({vercelToken:process.env.VERCEL_RECETTE_TOKEN,neonKey:process.env.NEON_API_KEY}));}
 catch(e){console.log(formatMetadataFailure(e));process.exitCode=1;}
}
