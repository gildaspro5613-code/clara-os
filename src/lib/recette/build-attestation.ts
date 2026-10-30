import {validateRecetteDatabaseBinding} from './database-binding';
import {verifyRecetteSqlRole,RecetteSqlIdentityRefused} from './runtime-attestation';
import {hasRecetteRuntimePermissions} from './environment-attestation';

/** Component for an authorized Vercel build using its ACTUAL injected variables.
 * No control-plane token, secret export or declared attestation flag is accepted.
 * PASS covers effective binding and readonly SQL, not control-plane provenance.
 * The controller must independently verify project/custom Environment and Neon
 * endpoint metadata BEFORE creating the build, then verify the resulting deployment.
 * The owner approved the changed ordering for one independent Recette attempt. */
export async function attestRecetteBuildBindings(env:NodeJS.ProcessEnv,onDiagnostic?:(stage:'DATABASE_BINDING'|'SQL_IDENTITY'|'SQL_PERMISSIONS')=>void):Promise<'PASS'|'FAIL'|'NON ATTESTÉ'>{
 let stage:'DATABASE_BINDING'|'SQL_IDENTITY'|'SQL_PERMISSIONS'='DATABASE_BINDING';
 const finish=(status:'PASS'|'FAIL'|'NON ATTESTÉ')=>{if(status!=='PASS')onDiagnostic?.(stage);return status;};
 const binding=validateRecetteDatabaseBinding(env);
 if(binding==='FAIL')return finish('FAIL');
 if(binding!=='OK')return finish('NON ATTESTÉ');
 try{
  stage='SQL_IDENTITY';
  await verifyRecetteSqlRole(env.DATABASE_URL!);
  stage='SQL_PERMISSIONS';
  return finish(await hasRecetteRuntimePermissions(env.DATABASE_URL!)?'PASS':'FAIL');
 }catch(e){return finish(e instanceof RecetteSqlIdentityRefused?'FAIL':'NON ATTESTÉ');}
}
