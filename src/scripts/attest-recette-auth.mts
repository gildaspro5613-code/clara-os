import {attestRecetteOAuthReception} from '../lib/recette/oauth-reception-attestation';
let stage:string|undefined;
const status=await attestRecetteOAuthReception(process.env,value=>{stage=value;});
console.log(status);
if(stage)console.log('ATTESTATION_STAGE='+stage);
if(status!=='PASS')process.exitCode=1;
