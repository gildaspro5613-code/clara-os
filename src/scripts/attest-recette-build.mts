import {attestRecetteBuildBindings} from '../lib/recette/build-attestation';
// Vercel build-only component; never print environment, URLs, exceptions or credentials.
// No GitHub output/artifact; a non-PASS prevents the subsequent Next build command.
const status=await attestRecetteBuildBindings(process.env);
console.log(status);
if(status!=='PASS')process.exitCode=1;
