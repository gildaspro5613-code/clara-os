import {attestRecetteOAuthReception} from '../lib/recette/oauth-reception-attestation';
import {enrollmentDatabase,enrollmentReady} from '../lib/auth/recette-google-enrollment';
let stage:string|undefined;
let status=await attestRecetteOAuthReception(process.env,value=>{stage=value;});
// An absent identity must never be reported as enrolled. Only a separately
// authorized, expiring single-use invitation can admit an enrollment-only build.
// Binding/configuration/read errors and missing permissions still block.
if(status==='FAIL'&&stage==='EXISTING_GOOGLE_MEMBERSHIP'){
 try{
  if(await enrollmentReady(enrollmentDatabase())){
   status='PASS';stage=undefined;
   console.log('ATTESTATION_MODE=ONE_TIME_GOOGLE_ENROLLMENT');
  }
 }catch{status='NON ATTESTÉ';}
}
console.log(status);
if(stage)console.log('ATTESTATION_STAGE='+stage);
if(status!=='PASS')process.exitCode=1;
