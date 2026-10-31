import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';

test('V1 job ledger: legacy 026 regression, Google/chat/document coexistence, reapplication and restore', {skip: !process.env.CANONICAL_TEST_CONTAINER}, async t => {
 const container=process.env.CANONICAL_TEST_CONTAINER!;assert.equal(container,'clara-canonical-test-postgres');
 const db='native_browser_'+randomUUID().replaceAll('-',''),restored='native_browser_'+randomUUID().replaceAll('-','');
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 t.after(()=>{for(const name of [db,restored])execFileSync('docker',['exec',container,'dropdb','--if-exists','-U','postgres',name],{stdio:'pipe'});});
 const pg=(s:string,target=db)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',target,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
 const apply=(sql:Buffer)=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:sql,stdio:'pipe'});
 const insert=(kind:string)=>{const id=createHash('sha256').update(kind).digest('hex');return pg(`INSERT INTO clara_external_event_jobs(job_id,scope_key,product_id,os_workspace_id,fingerprint,request,status,result,correlation_id,job_kind) VALUES('${id}','compatibility:${kind}','clara-os','w','${id}','{"synthetic":true}','completed','{"durable":true}','${'a'.repeat(32)}','${kind}')`);};
 const snapshot=(target=db)=>pg("SELECT COALESCE(jsonb_agg(to_jsonb(j) ORDER BY job_id),'[]'::jsonb)::text FROM clara_external_event_jobs j",target);
 await t.test('old constraint refuses Google receipts before any provider handoff',()=>{
  // Exact predicate shipped by 026 at 01e3d25; no Git/network dependency in CI.
  apply(Buffer.from("ALTER TABLE clara_external_event_jobs DROP CONSTRAINT clara_external_event_jobs_job_kind_check; ALTER TABLE clara_external_event_jobs ADD CONSTRAINT clara_external_event_jobs_job_kind_check CHECK(job_kind IN ('external-event','native-chat','native-document'));"));
  assert.throws(()=>insert('native-google'),error=>String((error as {stderr:Buffer}).stderr).includes('clara_external_event_jobs_job_kind_check'));
  assert.equal(pg("SELECT COUNT(*) FROM clara_external_event_jobs WHERE job_kind='native-google'"),'0');
 });
 await t.test('repair preserves all existing receipt kinds and rejects unknown types',()=>{
  apply(readFileSync('db/migrations/028_native_job_kind_compatibility.sql'));
  for(const kind of ['external-event','native-chat','native-google','native-document'])insert(kind);
  assert.throws(()=>insert('unapproved-job'),error=>String((error as {stderr:Buffer}).stderr).includes('clara_external_event_jobs_job_kind_check'));
 });
 await t.test('026 and 028 reapplication preserve completed receipts byte for byte',()=>{
  const before=snapshot();for(let i=0;i<2;i++){apply(readFileSync('db/migrations/026_native_document_continuity.sql'));apply(readFileSync('db/migrations/028_native_job_kind_compatibility.sql'));}assert.equal(snapshot(),before);
  assert.equal(pg("SELECT bool_and(NOT prosecdef) FROM pg_proc WHERE proname IN ('clara_native_google_work_command','clara_native_document_command','clara_native_runtime_command')"),'t');
 });
 await t.test('actual pg_dump and restore preserve histories, receipts and constraint',()=>{
  const before=snapshot();execFileSync('docker',['exec',container,'createdb','-U','postgres',restored]);
  const dump=execFileSync('docker',['exec',container,'pg_dump','-U','postgres',db]);
  execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',restored,'-q','-v','ON_ERROR_STOP=1'],{input:dump,stdio:'pipe'});
  assert.equal(snapshot(restored),before);assert.equal(pg("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='clara_external_event_jobs_job_kind_check'",restored),pg("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='clara_external_event_jobs_job_kind_check'"));
 });
});
