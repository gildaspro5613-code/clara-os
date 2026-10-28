import {appendFileSync} from 'node:fs';
import {attestRecetteEnvironment} from '../lib/recette/environment-attestation';
// Only fixed status literals leave this process. Values remain in memory, never artifacts/env files.
const status=await attestRecetteEnvironment({vercelToken:process.env.VERCEL_RECETTE_TOKEN,neonKey:process.env.NEON_API_KEY});
console.log(status);
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,status+'\n');
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'status='+status+'\n');
if(status!=='PASS')process.exitCode=1;
