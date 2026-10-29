import {attestRecetteBuildBindings} from '../lib/recette/build-attestation';
// Vercel build-only component; never print environment, URLs, exceptions or credentials.
// No GitHub output/artifact; a non-PASS prevents the subsequent Next build command.
let stage:string|undefined;
const status=await attestRecetteBuildBindings(process.env,value=>{stage=value;});
console.log(status);
if(stage)console.log('ATTESTATION_STAGE='+stage);
if(status!=='PASS')process.exitCode=1;
