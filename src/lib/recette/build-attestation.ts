import {validateRecetteDatabaseBinding} from './database-binding';
import {verifyRecetteSqlRole,RecetteSqlIdentityRefused} from './runtime-attestation';
import {hasRecetteRuntimePermissions} from './environment-attestation';

/** Component for an authorized Vercel build using its ACTUAL injected variables.
 * No control-plane token, secret export or declared attestation flag is accepted.
 * PASS covers effective binding and readonly SQL, not control-plane provenance.
 * The controller must independently verify project/custom Environment and Neon
 * endpoint metadata BEFORE creating the build, then verify the resulting deployment.
 * Dormant until the changed ordering (create before SQL attestation) is approved. */
export async function attestRecetteBuildBindings(env:NodeJS.ProcessEnv):Promise<'PASS'|'FAIL'|'NON ATTESTÉ'>{
 const binding=validateRecetteDatabaseBinding(env);
 if(binding==='FAIL')return 'FAIL';
 if(binding!=='OK')return 'NON ATTESTÉ';
 try{
  await verifyRecetteSqlRole(env.DATABASE_URL!);
  return await hasRecetteRuntimePermissions(env.DATABASE_URL!)?'PASS':'FAIL';
 }catch(e){return e instanceof RecetteSqlIdentityRefused?'FAIL':'NON ATTESTÉ';}
}
