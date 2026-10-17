/** Read-only CLI: no session issuer or provisioning imports. */
import {runCloudPreflight} from '../lib/recette/cloud-preflight';
runCloudPreflight(process.env,process.argv.slice(2)).then(report=>{
 console.info(JSON.stringify(report));
 if(report.status!=='PRECHECK_PASSED')process.exitCode=1;
}).catch(()=>{console.info(JSON.stringify({status:'PRECHECK_REFUSED',code:'RECETTE_PREFLIGHT_REFUSED',writesExecuted:false}));process.exitCode=1;});
