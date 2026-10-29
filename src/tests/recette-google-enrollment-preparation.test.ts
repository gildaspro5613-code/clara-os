import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,statSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');

test('offline operator preparation: private files, no identity/token in logs, no overwrite or database access',t=>{
 const dir=mkdtempSync(join(tmpdir(),'recette-enrollment-preparation-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const emailFile=join(dir,'email.txt'),output=join(dir,'private');writeFileSync(emailFile,'owner@example.test\n',{mode:0o600});
 const run=(input=emailFile)=>spawnSync(process.execPath,['--import','tsx','src/scripts/prepare-recette-google-enrollment.mts','--prepare-single-google-enrollment',input,output],{encoding:'utf8',env:{...process.env,DATABASE_URL:'must-not-be-used'}});
 const result=run();assert.equal(result.status,0,result.stderr);
 const ticket=readFileSync(join(output,'invitation.txt'),'utf8').trim(),sql=readFileSync(join(output,'authorize.sql'),'utf8');
 assert.match(ticket,/^[A-Za-z0-9_-]{43}$/);assert(!sql.includes(ticket));assert(!sql.includes('owner@example.test'));assert(sql.includes(hash(ticket)));assert(sql.includes(hash('owner@example.test')));
 assert(!result.stdout.includes(ticket));assert(!result.stdout.includes('owner@example.test'));assert.equal(statSync(output).mode&0o777,0o700);assert.equal(statSync(join(output,'invitation.txt')).mode&0o777,0o600);
 assert.notEqual(run().status,0);assert.equal(readFileSync(join(output,'invitation.txt'),'utf8').trim(),ticket);
 const link=join(dir,'link');symlinkSync(emailFile,link);assert.notEqual(run(link).status,0);
});

test('build exception never claims existing membership: explicit readiness only, read failures stay blocked',async()=>{
 const code=ts.transpileModule(readFileSync('src/scripts/attest-recette-auth.mts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const [status,stage,ready,expected,calls] of [
  ['PASS',undefined,false,'PASS',0],['NON ATTESTÉ','EXISTING_GOOGLE_MEMBERSHIP',true,'NON ATTESTÉ',0],
  ['FAIL','DATABASE_BINDING',true,'FAIL',0],['FAIL','GOOGLE_CONFIGURATION',true,'FAIL',0],
  ['FAIL','EXISTING_GOOGLE_MEMBERSHIP',false,'FAIL',1],['FAIL','EXISTING_GOOGLE_MEMBERSHIP',true,'PASS',1],
  ['FAIL','EXISTING_GOOGLE_MEMBERSHIP','network','NON ATTESTÉ',1],
 ] as const){
  const lines:string[]=[];let actualCalls=0;const processMock:{env:object;exitCode?:number}={env:{}};
  await vm.runInNewContext('(async()=>{'+code+'})()',{
   exports:{},process:processMock,console:{log:(s:string)=>lines.push(s)},require:(id:string)=>{
    if(id.includes('oauth-reception-attestation'))return {attestRecetteOAuthReception:async(_env:object,diagnostic:(s:string)=>void)=>{if(stage)diagnostic(stage);return status;}};
    if(id.includes('recette-google-enrollment'))return {enrollmentDatabase:()=>({}),enrollmentReady:async()=>{actualCalls++;if(ready==='network')throw Error('private detail');return ready;}};
    throw Error('UNEXPECTED_IMPORT');
   },
  });
  assert.equal(actualCalls,calls);assert(lines.includes(expected));assert.equal(processMock.exitCode,expected==='PASS'?undefined:1);
  assert.equal(lines.includes('ATTESTATION_MODE=ONE_TIME_GOOGLE_ENROLLMENT'),calls===1&&ready===true);assert(!lines.some(line=>line.includes('private detail')));
 }
});
