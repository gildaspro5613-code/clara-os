/** Read-only prerequisite for the one authorized Recette attempt. */
export async function verifyRecetteCI({token,sha,runId,http=fetch,applicationSha}) {
 if(!token||!/^[a-f0-9]{40}$/.test(sha??'')||!/^\d+$/.test(runId??''))throw Error('CI_ACCESS_UNAVAILABLE');
 const repo='gildaspro5613-code/clara-os';
 const read=async path=>{
  const response=await http('https://api.github.com/repos/'+repo+path,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'}});
  if(!response.ok)throw Error('CI_ACCESS_UNAVAILABLE');return response.json();
 };
 const ref=await read('/git/ref/heads/fix/clara-os-historical-interface-20261028');
 if(ref.object?.sha!==sha)throw Error('CONTROLLER_BRANCH_CHANGED');
 const checkSha=applicationSha??sha;
 if(!/^[a-f0-9]{40}$/.test(checkSha))throw Error('CI_ACCESS_UNAVAILABLE');
 const checks=await read('/commits/'+checkSha+'/check-runs?per_page=100&filter=latest');
 if(!Array.isArray(checks.check_runs)||checks.total_count>100)throw Error('CI_NOT_ATTESTED');
 const runUrl='https://github.com/'+repo+'/actions/runs/'+runId;
 const prefix=runUrl+'/';
 const required=checks.check_runs.filter(c=>!(typeof c.details_url==='string'&&(c.details_url===runUrl||c.details_url.startsWith(prefix))));
 if(required.length<5||required.some(c=>c.status!=='completed'||c.conclusion!=='success'))throw Error('CI_NOT_GREEN');
 const status=await read('/commits/'+checkSha+'/status');
 if(typeof status.total_count!=='number'||(status.total_count>0&&status.state!=='success'))throw Error('CI_NOT_GREEN');
 return 'PASS';
}
if(process.argv[1]?.endsWith('/verify-recette-ci.mjs')){
 try{console.log(await verifyRecetteCI({token:process.env.GH_TOKEN,sha:process.env.CONTROLLER_SHA,runId:process.env.GITHUB_RUN_ID,applicationSha:process.env.APPLICATION_SHA}));}
 catch(e){console.log(['CI_ACCESS_UNAVAILABLE','CONTROLLER_BRANCH_CHANGED','CI_NOT_ATTESTED','CI_NOT_GREEN'].includes(e?.message)?e.message:'CI_NOT_ATTESTED');process.exitCode=1;}
}
