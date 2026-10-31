import {attestRecetteRuntime} from '../lib/recette/runtime-attestation';
// Public source SHA only; secrets must be effective injected bindings, not args.
const args=process.argv.slice(2);
if(args.length!==1||!/^--source-sha=[a-f0-9]{40}$/.test(args[0])){
 console.info(JSON.stringify({status:'NON ATTESTÉ',checks:[],writesRequested:false}));process.exitCode=1;
}else{
 const report=await attestRecetteRuntime(process.env,args[0].slice('--source-sha='.length));
 console.info(JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1;
}
