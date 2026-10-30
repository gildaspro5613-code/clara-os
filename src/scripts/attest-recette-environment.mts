import {appendFileSync} from 'node:fs';
import {attestRecetteEnvironment} from '../lib/recette/environment-attestation';
// Only fixed status literals leave this process. Values remain in memory, never artifacts/env files.
let stage:string|undefined;
const status=await attestRecetteEnvironment({vercelToken:process.env.VERCEL_RECETTE_TOKEN,neonKey:process.env.NEON_API_KEY},fetch,value=>{stage=value;});
console.log(status);
if(stage)console.log('ATTESTATION_STAGE='+stage);
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,status+(stage?' · ATTESTATION_STAGE='+stage:'')+'\n');
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'status='+status+'\n');
if(status!=='PASS')process.exitCode=1;
