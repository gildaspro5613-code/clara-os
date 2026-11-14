import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import nodemailer from 'nodemailer';
import type {RegistryQuery} from '@/lib/canonical/registry';
import {runIonosMonitorTick,mailMonitorCommands} from '@/lib/native/mail-monitor';
import {encryptCredentialPayload,decryptCredentialPayload} from '@/lib/connections/credential-store';
import {IONOS_MAILBOX_ADDRESSES,type MailCredentials,type MailContent} from '@/lib/connectors/ionos/transport';
import {SimulatedMail} from './helpers/native-mail-fixture';

test('autonomous IMAP PostgreSQL: five mailboxes, SQL service isolation, atomic revocation, leases, CAS and durable recovery',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 assert.equal(process.env.CANONICAL_TEST_CONTAINER,'clara-canonical-test-postgres');
 const container='clara-canonical-test-postgres',db='native_browser_'+randomUUID().replaceAll('-',''),restored='native_browser_'+randomUUID().replaceAll('-','');
 const roleA='mailmon_a_'+randomUUID().replaceAll('-',''),roleB='mailmon_b_'+randomUUID().replaceAll('-','');
 const sqlArgs=['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c'];
 const pg=(s:string)=>execFileSync('docker',[...sqlArgs,s],{encoding:'utf8',stdio:'pipe'}).trim();
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});
 t.after(()=>{
  for(const role of [roleA,roleB])pg(`DROP OWNED BY ${role}`);
  for(const name of [db,restored])execFileSync('docker',['exec',container,'dropdb','--if-exists','-U','postgres',name],{stdio:'pipe'});
  execFileSync('docker',['exec',container,'psql','-U','postgres','-q','-c',`DROP ROLE ${roleA};DROP ROLE ${roleB}`],{stdio:'pipe'});
 });
 const migration=readFileSync('db/migrations/023_native_mail_monitor_runtime.sql');
 const apply=()=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:migration,stdio:'pipe'});
 const snapshot=pg('SELECT count(*) FROM clara_auth_sessions');apply();apply();assert.equal(pg('SELECT count(*) FROM clara_auth_sessions'),snapshot);
 pg(`CREATE ROLE ${roleA} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;CREATE ROLE ${roleB} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;GRANT USAGE ON SCHEMA public TO ${roleA},${roleB};GRANT EXECUTE ON FUNCTION clara_native_mail_monitor_command(TEXT,JSONB) TO ${roleA},${roleB}`);
 const key=Buffer.alloc(32,9);process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=key.toString('base64');
 const providers=new Map<string,SimulatedMail>();
 for(const [i,address]of IONOS_MAILBOX_ADDRESSES.entries()){
  const owner=i===1?'b':'a',role=i===1?roleB:roleA,connection='monitor-'+i;
  const credentials:MailCredentials={address,password:'synthetic-only',imapHost:'imap.ionos.fr',imapPort:993,smtpHost:'smtp.ionos.fr',smtpPort:465,folders:['INBOX'],configurationReviewed:true};
  const encrypted=encryptCredentialPayload(credentials,key).replaceAll("'","''");
  pg(`INSERT INTO clara_connections(id,workspace_id,provider,status) VALUES('${connection}','w','ionos','ACTIVE');INSERT INTO clara_native_mail_authority(connection_id,workspace_id,owner_user_id,address,reviewed_by,review_reason) VALUES('${connection}','w','${owner}','${address}','${owner}','Explicit isolated owner attestation for autonomous read-only test');INSERT INTO clara_connection_credentials(connection_id,encrypted_payload) VALUES('${connection}','${encrypted}');INSERT INTO clara_native_mail_monitor_grants(connection_id,workspace_id,granted_by,reviewed_by,review_reason,service_role) VALUES('${connection}','w','${owner}','${owner}','Explicit isolated service grant; never real mailbox authority','${role}')`);
  const provider=new SimulatedMail();provider.content={...provider.content,subject:'PRIVATE_BOX_'+i,to:[address]};providers.set(address,provider);
 }
 const query=(role:string):RegistryQuery=>async(strings,...values)=>{
  const statement=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');
  try {
   const out=await promisify(execFile)('docker',[...sqlArgs,`SET SESSION AUTHORIZATION ${role};SELECT row_to_json(r) FROM (${statement})r`],{maxBuffer:8*1024*1024});
   return out.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));
  }catch(error){const stderr=String((error as {stderr?:string}).stderr);const code=stderr.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1];if(code&&!['42501','40001','22023'].includes(code))console.error(stderr.split('\n')[0]);throw {code};}
 };
 const commandA=mailMonitorCommands(query(roleA)),commandB=mailMonitorCommands(query(roleB));
 const command=commandA;
 const ref={connectionId:'monitor-0',workspaceId:'w'};
 const due=(id='monitor-0')=>pg(`UPDATE clara_native_mail_monitor_grants SET next_poll_at=clock_timestamp()-INTERVAL '1 minute' WHERE connection_id='${id}'`);
 let smtp=0;t.mock.method(nodemailer,'createTransport',()=>{smtp++;throw Error('SMTP_MUST_NOT_RUN');});
 let reads=0;
 const factory=(c:MailCredentials)=>({sync:async(folder:string,cursor:{uidValidity?:string;lastUid:number})=>{reads++;return providers.get(c.address)!.sync(folder,cursor);}});
 const tick=(role=roleA,f=factory)=>runIonosMonitorTick({query:query(role),factory:f});
 // SQL identities have no direct credentials/DML, user impersonation or SMTP capability.
 assert.throws(()=>pg(`SET SESSION AUTHORIZATION ${roleA};SELECT * FROM clara_connection_credentials`));
 assert.throws(()=>pg(`SET SESSION AUTHORIZATION ${roleA};UPDATE clara_native_mail_monitor_grants SET enabled=true`));
 assert.throws(()=>pg(`SET SESSION AUTHORIZATION ${roleA};SELECT clara_native_mail_command('fake','w','c1','p1','fake','claim','{}')`));
 await assert.rejects(()=>command('send',ref));
 pg(`ALTER ROLE ${roleB} NOLOGIN`);await assert.rejects(()=>commandB('list'),{status:403,code:'MAIL_MONITOR_AUTHORITY_DENIED'});pg(`ALTER ROLE ${roleB} LOGIN`);
 pg(`GRANT pg_read_all_data TO ${roleA}`);await assert.rejects(()=>command('list'),{status:403,code:'MAIL_MONITOR_AUTHORITY_DENIED'});pg(`REVOKE pg_read_all_data FROM ${roleA}`);
 assert.throws(()=>pg(`SET ROLE ${roleA};SELECT clara_native_mail_monitor_command('list','{}')`));
 process.env.CLARA_IONOS_MONITOR_ENABLED='true';t.after(()=>{delete process.env.CLARA_IONOS_MONITOR_ENABLED;delete process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;});
 assert.equal((await tick()).polled,0);assert.equal(reads,0); // 022 disabled by default.
 pg('UPDATE clara_native_mail_monitor_grants SET enabled=true');
 assert.equal(((await command('list')).connections as unknown[]).length,4);assert.equal(((await commandB('list')).connections as unknown[]).length,1);
 await assert.rejects(()=>command('claim',{connectionId:'monitor-1',workspaceId:'w'}));await assert.rejects(()=>command('claim',{...ref,workspaceId:'foreign'}));
 assert.equal((await tick()).polled,4);assert.equal((await tick(roleB)).polled,1);assert.equal(smtp,0);
 assert.equal(pg('SELECT count(*) FROM clara_native_mail_messages'),'5');
 const ciphertext=pg("SELECT encrypted_payload FROM clara_native_mail_messages WHERE connection_id='monitor-1'");assert.equal(decryptCredentialPayload<MailContent>(ciphertext,key).subject,'PRIVATE_BOX_1');assert(!ciphertext.includes('PRIVATE_BOX'));
 // The next tick is durably throttled, regardless of process/session restart.
 const previousReads=reads;assert.equal((await tick()).polled,0);assert.equal(reads,previousReads);
 assert.equal(pg("SELECT bool_and(next_poll_at>clock_timestamp()+INTERVAL '4 minutes') FROM clara_native_mail_monitor_grants"),'t');
 pg('UPDATE clara_auth_sessions SET revoked_at=clock_timestamp()');due();providers.get(IONOS_MAILBOX_ADDRESSES[0])!.uids=[1,2];assert.equal((await tick()).polled,1);assert.equal(pg("SELECT last_uid FROM clara_native_mail_sync WHERE connection_id='monitor-0'"),'2');
 // Concurrency: one durable lease, one transport, no duplicate messages.
 due();providers.get(IONOS_MAILBOX_ADDRESSES[0])!.uids=[1,2,3];
 const races=await Promise.all([tick(),tick()]);assert.equal(races.reduce((n,r)=>n+r.polled,0),1);assert.equal(pg("SELECT count(*) FROM clara_native_mail_messages WHERE connection_id='monitor-0'"),'3');
 // Revocation while IMAP is in flight: successful provider bytes never commit.
 due();const before=pg("SELECT last_uid FROM clara_native_mail_sync WHERE connection_id='monitor-0'");
 const revokeFactory=(c:MailCredentials)=>({sync:async(folder:string,cursor:{uidValidity?:string;lastUid:number})=>{
  pg("UPDATE clara_native_mail_monitor_grants SET enabled=false,revoked_at=clock_timestamp() WHERE connection_id='monitor-0'");
  const provider=providers.get(c.address)!;provider.uids=[1,2,3,4];return provider.sync(folder,cursor);
 }});
 assert.equal((await tick(roleA,revokeFactory)).failed,1);assert.equal(pg("SELECT last_uid FROM clara_native_mail_sync WHERE connection_id='monitor-0'"),before);
 const gen=pg("SELECT generation FROM clara_native_mail_monitor_grants WHERE connection_id='monitor-0'");
 assert.equal((await tick()).polled,0);pg("UPDATE clara_native_mail_monitor_grants SET enabled=true,revoked_at=NULL WHERE connection_id='monitor-0'");assert.notEqual(pg("SELECT generation FROM clara_native_mail_monitor_grants WHERE connection_id='monitor-0'"),gen);
 assert.equal((await tick()).polled,1);
 // Explicit owner/connection revocation also blocks a claimed commit.
 for(const change of ["UPDATE clara_workspace_memberships SET revoked_at=clock_timestamp() WHERE user_id='a' AND workspace_id='w'","UPDATE clara_connections SET status='DISCONNECTED' WHERE id='monitor-0'","UPDATE clara_native_mail_authority SET revoked_at=clock_timestamp(),revision=revision+1 WHERE connection_id='monitor-0'"]){
  due();const claim=await command('claim',ref);pg(change);await assert.rejects(()=>command('check',claim));
  pg("UPDATE clara_workspace_memberships SET revoked_at=NULL WHERE user_id='a' AND workspace_id='w';UPDATE clara_connections SET status='ACTIVE' WHERE id='monitor-0'");
  // Authority history is immutable; do not restore a revoked authority by inference.
  if(change.includes('clara_native_mail_authority'))break;
  pg("UPDATE clara_native_mail_monitor_grants SET lease_until=clock_timestamp()-INTERVAL '1 minute' WHERE connection_id='monitor-0'");
 }
 // Read failure for one mailbox does not stop another. No raw provider error leaks.
 pg("UPDATE clara_native_mail_monitor_grants SET next_poll_at=clock_timestamp()-INTERVAL '1 minute' WHERE connection_id IN ('monitor-2','monitor-3')");providers.get(IONOS_MAILBOX_ADDRESSES[2])!.failSync=true;
 const failure=await tick();assert.equal(failure.failed,1);assert.equal(failure.polled,1);assert.equal(pg("SELECT last_failure_code FROM clara_native_mail_monitor_grants WHERE connection_id='monitor-2'"),'MAIL_MONITOR_READ_FAILED');
 // Process crash after claim: no cursor write; expired lease can resume reads safely.
 const ref3={connectionId:'monitor-3',workspaceId:'w'};due('monitor-3');const stale=await command('claim',ref3);
 pg("UPDATE clara_native_mail_monitor_grants SET lease_until=clock_timestamp()-INTERVAL '1 minute',next_poll_at=clock_timestamp()-INTERVAL '1 minute' WHERE connection_id='monitor-3'");
 const resumed=await command('claim',ref3);assert.notEqual(stale.leaseToken,resumed.leaseToken);await assert.rejects(()=>command('check',stale));await command('fail',resumed);
 // Manual sync cursor wins before worker persistence => no stale cursor overwrite.
 due('monitor-3');const c=await command('claim',ref3);pg("UPDATE clara_native_mail_sync SET revision=revision+1 WHERE connection_id='monitor-3'");await assert.rejects(()=>command('commit',{...c,uidValidity:'1',lastUid:1,uids:[1],messages:[]}));await command('fail',c);
 // Lost acknowledgement of a committed SQL write: durable cursor prevents IMAP replay duplicates.
 due('monitor-3');providers.get(IONOS_MAILBOX_ADDRESSES[3])!.uids=[1,2];let lost=false;
 const baseQuery=query(roleA);const lossy:RegistryQuery=async(strings,...values)=>{const rows=await baseQuery(strings,...values);if(values[0]==='commit'&&!lost){lost=true;throw Error('SYNTHETIC_ACK_LOST');}return rows;};
 assert.equal((await runIonosMonitorTick({query:lossy,factory})).polled,1);assert.equal(pg("SELECT last_uid FROM clara_native_mail_sync WHERE connection_id='monitor-3'"),'2');
 due('monitor-3');assert.equal((await tick()).polled,1);assert.equal(pg("SELECT count(*) FROM clara_native_mail_messages WHERE connection_id='monitor-3'"),'2');
 // UIDVALIDITY changes keep old ciphertext/history, replace cursor, no identifier collision.
 due('monitor-3');providers.get(IONOS_MAILBOX_ADDRESSES[3])!.validity='2';providers.get(IONOS_MAILBOX_ADDRESSES[3])!.uids=[1];assert.equal((await tick()).polled,1);
 assert.equal(pg("SELECT count(*) FROM clara_native_mail_messages WHERE connection_id='monitor-3'"),'3');assert.equal(pg("SELECT count(*) FROM clara_native_mail_messages WHERE connection_id='monitor-3' AND available"),'1');
 assert.equal(smtp,0);for(const provider of providers.values())assert.equal(provider.sent.length,0);
 // Local backup/restoration of all schema/data including cursor, lease and health.
 const dump=execFileSync('docker',['exec',container,'pg_dump','-U','postgres','--no-owner',db],{maxBuffer:16*1024*1024});
 execFileSync('docker',['exec',container,'createdb','-U','postgres',restored]);
 execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',restored,'-q','-v','ON_ERROR_STOP=1'],{input:dump,stdio:'pipe'});
 const restoredPg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',restored,'-qAt','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
 assert.equal(restoredPg('SELECT count(*) FROM clara_native_mail_messages'),pg('SELECT count(*) FROM clara_native_mail_messages'));
 assert.equal(restoredPg("SELECT uid_validity||':'||last_uid FROM clara_native_mail_sync WHERE connection_id='monitor-3'"),'2:1');
 assert.ok(restoredPg(`SET SESSION AUTHORIZATION ${roleB};SELECT clara_native_mail_monitor_command('status','{"connectionId":"monitor-1","workspaceId":"w"}')`).includes('lastSuccessAt'));
 assert.throws(()=>restoredPg(`SET SESSION AUTHORIZATION ${roleB};SELECT * FROM clara_connection_credentials`));
});
