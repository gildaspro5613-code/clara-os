/** No protected value is requested, decrypted, printed or written to disk. */
export async function verifyRecetteMetadata({vercelToken,neonKey,http=fetch}){
 if(!vercelToken||!neonKey)throw Error('METADATA_ACCESS_UNAVAILABLE');
 const project='prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz',team='team_0BeqOAO8t5oDEBdzHHdekcxv',environment='env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM';
 async function read(path){const url=new URL(path,'https://api.vercel.com');url.searchParams.set('teamId',team);
  const response=await http(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+vercelToken}});
  if(!response.ok)throw Error('METADATA_ACCESS_UNAVAILABLE');return response.json();}
 const p=await read('/v9/projects/'+project);
 if(p.id!==project||p.accountId!==team||p.name!=='clara-os-recette'||p.link||p.gitRepository)throw Error('METADATA_REFUSED');
 const custom=await read('/projects/'+project+'/custom-environments');
 const matches=Array.isArray(custom.environments)?custom.environments.filter(e=>e.id===environment||e.slug==='clara-os-recette'):[];
 if(matches.length!==1||matches[0].id!==environment||matches[0].slug!=='clara-os-recette'||(matches[0].projectId!==undefined&&matches[0].projectId!==project))throw Error('METADATA_REFUSED');
 const bindings=await read('/v10/projects/'+project+'/env?customEnvironmentId='+environment+'&decrypt=false');
 if(!Array.isArray(bindings.envs)||bindings.pagination?.next)throw Error('METADATA_REFUSED');
 const rows=bindings.envs;
 if(rows.some(e=>['POSTGRES_URL','VERCEL_ENV','VERCEL_PROJECT_ID','VERCEL_TARGET_ENV'].includes(e.key)))throw Error('METADATA_REFUSED');
 for(const key of ['DATABASE_URL','CLARA_RECETTE_NEON_HOST','CLARA_RECETTE_NEON_BRANCH_ID','CLARA_RECETTE_MODE']){
  const entries=rows.filter(e=>e.key===key);
  if(entries.length!==1||entries[0].gitBranch||!Array.isArray(entries[0].customEnvironmentIds)||entries[0].customEnvironmentIds.length!==1||entries[0].customEnvironmentIds[0]!==environment||
    entries[0].target==='production'||entries[0].target?.includes('production'))throw Error('METADATA_REFUSED');
 }
 const domains=await read('/v9/projects/'+project+'/domains');
 if(!Array.isArray(domains.domains)||domains.pagination?.next||domains.domains.some(d=>!/^clara-os-recette(?:-[a-z0-9-]+)?\.vercel\.app$/.test(d.name??'')))throw Error('PROJECT_DOMAINS_REFUSED');
 const response=await http('https://console.neon.tech/api/v2/projects/fragrant-dream-31652403/endpoints',{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+neonKey}});
 if(!response.ok)throw Error('METADATA_ACCESS_UNAVAILABLE');const neon=await response.json();
 const endpoints=Array.isArray(neon.endpoints)?neon.endpoints.filter(e=>e.host==='ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech'):[];
 if(endpoints.length!==1||endpoints[0].branch_id!=='br-crimson-feather-b2zr00sf')throw Error('NEON_ENDPOINT_REFUSED');
 return 'PASS'; // Metadata only; NOT SQL or effective-value attestation.
}
if(process.argv[1]?.endsWith('/verify-recette-metadata.mjs')){
 try{console.log(await verifyRecetteMetadata({vercelToken:process.env.VERCEL_RECETTE_TOKEN,neonKey:process.env.NEON_API_KEY}));}
 catch(e){console.log(['METADATA_ACCESS_UNAVAILABLE','METADATA_REFUSED','PROJECT_DOMAINS_REFUSED','NEON_ENDPOINT_REFUSED'].includes(e?.message)?e.message:'METADATA_REFUSED');process.exitCode=1;}
}
