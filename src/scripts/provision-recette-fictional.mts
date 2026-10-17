/** No writes by default. --apply is an explicit future operator authorization. */
import { neon } from '@neondatabase/serverless';
import { constants } from 'node:fs';
import { open, lstat } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { cloudRecetteFixtureToken,fixture,newRecetteFixtureToken,preflightRecetteFixture,seedRecetteFixture } from '../lib/recette/fixture-provisioning';
import { recetteDatabase } from '../lib/recette/policy';

async function main(){
 if(process.argv.length===2||process.argv.slice(2).join(' ')==='--plan'){
  console.info('PLAN ONLY. Requires separate authorization: endpoint metadata read, limited-role fixture writes, private local file or protected Cloud session secret. No database or provider called.');return;
 }
 const checkOnly=process.argv[2]==='--check-cloud';
 const cloud=checkOnly||process.argv[2]==='--apply-cloud';
 if(process.argv.length!==(cloud?4:5)||(!cloud&&process.argv[2]!=='--apply')||process.argv[3]!==`--confirm=${fixture.branch}`)
  throw Error('RECETTE_EXPLICIT_AUTHORIZATION_REQUIRED');
 const cloudToken=cloud?cloudRecetteFixtureToken(process.env):undefined;
 const path=process.argv[4];if(!cloud&&!isAbsolute(path))throw Error('RECETTE_PRIVATE_FILE_REQUIRED');
 recetteDatabase();
 const query=neon(process.env.DATABASE_URL!);
 // Explicitly verify endpoint/branch and SQL role/grants BEFORE local or SQL writes.
 await preflightRecetteFixture(process.env,query,fetch);
 if(checkOnly){console.info('Read-only preflight passed. Neon HTTP provisioning remains unverified; no fixture was written.');return;}
 if(cloudToken){
  await seedRecetteFixture(query,cloudToken);
  console.info('Fictional Cloud fixture ready. Use the protected session secret with /recette. Expiry and revocations were not extended.');return;
 }
 const parent=await lstat(dirname(path));
 if(!parent.isDirectory()||parent.isSymbolicLink()||parent.uid!==process.getuid?.()||(parent.mode&0o077)!==0)
  throw Error('RECETTE_PRIVATE_DIRECTORY_REQUIRED');
 let token:string;
 try{
  const file=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  token=newRecetteFixtureToken();
  try{await file.writeFile(JSON.stringify({workspaceId:fixture.workspace,token})+'\n');await file.sync();}finally{await file.close();}
 }catch(error){
  if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
  const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
   const stat=await file.stat();if(!stat.isFile()||stat.uid!==process.getuid?.()||(stat.mode&0o077)!==0||stat.size>1024)throw Error('RECETTE_PRIVATE_FILE_REQUIRED');
   const saved=JSON.parse(await file.readFile('utf8'));if(saved.workspaceId!==fixture.workspace||typeof saved.token!=='string')throw Error('RECETTE_PRIVATE_FILE_INVALID');token=saved.token;
  }finally{await file.close();}
 }
 await seedRecetteFixture(query,token);
 console.info('Fictional fixture ready. Use the private session file with /recette; no session secret is printed. Existing token expiry/revocations were not extended.');
}
main().catch(()=>{console.error('RECETTE_PROVISIONING_STOPPED: target, metadata, privileges, fixture collision or session must be reviewed. No secret is logged; retain the same protected session secret or private file for ambiguous-commit recovery.');process.exitCode=1;});
