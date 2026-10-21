import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {withNativeScope,nativeCommands,nativeMission,writableNativeContext} from '@/lib/native/scoped-context';
import {nativeMailCommand} from '@/lib/native/mail-authority';
import {NativeMail,sendNativeMail} from '@/lib/native/mail';
import {OpenAIResponsesEngine} from '@/lib/connectors/internal/openai/responses/openai-responses-engine';
import type {RegistryQuery} from '@/lib/canonical/registry';
import {seedNativeMailFixture,SimulatedMail} from './helpers/native-mail-fixture';

test('IONOS real PostgreSQL: two independent authorities, explicit bindings, exact approvals, concurrent single-use SMTP, revocation and durable restart',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 assert.equal(process.env.CANONICAL_TEST_CONTAINER,'clara-canonical-test-postgres');const db='native_browser_'+randomUUID().replaceAll('-',''),container='clara-canonical-test-postgres';
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:'pipe'});t.after(()=>execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]));
 const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',s],{encoding:'utf8',stdio:'pipe'});
 const migration=readFileSync('db/migrations/016_native_ionos_mail.sql');const migrate=(database=db)=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-q','-v','ON_ERROR_STOP=1'],{input:migration,stdio:'pipe'});migrate();migrate();
 execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/018_native_mail_pagination.sql'),stdio:'pipe'});
 execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/021_native_mail_five_accounts.sql'),stdio:'pipe'});
 seedNativeMailFixture(pg);
 const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,part,i)=>s+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{const r=await promisify(execFile)('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(r) FROM (${statement})r`]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){const stderr=String((e as {stderr:unknown}).stderr);const code=stderr.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1];if(!['42501','40001','23505'].includes(code??''))console.error(stderr.split('\n')[0]);throw {code};}};
 const digest=(s:string)=>createHash('sha256').update(s.repeat(43)).digest('hex'),commands=nativeCommands(query);
 const create=async(user='A',c='c1',p='p1')=>String((await commands({digest:digest(user),workspaceId:'w',clientId:c,projectId:p,sessionId:'native:new'},'create')).sessionId);
 const a=await create(),b=await create('B'),p2=await create('A','c1','p2'),p3=await create('A','c2','p3');
 // SECURITY INVOKER: a SQL read-only role cannot acquire runtime locks or
 // mutate metadata. These are disposable role grants, NOT production advice.
 const role='mail_role_'+randomUUID().replaceAll('-','');pg(`CREATE ROLE ${role};GRANT USAGE ON SCHEMA public TO ${role};GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${role};GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${role};`);
 try{assert.throws(()=>pg(`SET ROLE ${role};SELECT clara_native_mail_command('${digest('A')}','w','c1','p1','${a}','list','{}')`));pg(`GRANT INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO ${role}`);assert.ok(pg(`SET ROLE ${role};SELECT clara_native_mail_command('${digest('A')}','w','c1','p1','${a}','list','{}')`).includes('mail-clara'));}finally{pg(`DROP OWNED BY ${role};DROP ROLE ${role}`);}
 assert.equal(pg("SELECT prosecdef FROM pg_proc WHERE proname='clara_native_mail_command'").trim(),'f');
 process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 const request=(user='A',sid=a,c='c1',p='p1',w='w')=>new Request('https://os.fixture.example/api/native/mail?'+new URLSearchParams({workspaceId:w,clientId:c,projectId:p,sessionId:sid}),{headers:{cookie:'clara_auth_session='+user.repeat(43),origin:'https://os.fixture.example'}});
 const run=<T>(fn:()=>Promise<T>,req=request(),write=true)=>withNativeScope(req,write,fn,query);
 const providerA=new SimulatedMail(),providerB=new SimulatedMail(),factory=(credentials:{address:string})=>credentials.address==='clara@melodie.digital'?providerA:providerB;
 const attachmentId=createHash('sha256').update('APPROVED_NOTE').digest('hex');providerA.content.attachments=[{id:attachmentId,name:'note.txt',type:'text/plain',size:13,sha256:attachmentId,content:Buffer.from('APPROVED_NOTE').toString('base64')}];
 const mail=async(id='mail-clara')=>new NativeMail(id,factory).initialize();
 pg("INSERT INTO clara_auth_workspaces(id) VALUES('other-w');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','other-w','owner');INSERT INTO clara_registry_clients VALUES('other-w','other-c','Other client','a',NOW(),NULL);INSERT INTO clara_registry_projects VALUES('other-w','other-p','other-c','Other project','a',NOW(),NULL);INSERT INTO clara_registry_client_access VALUES('other-w','other-c','a',true,true,true,NULL);INSERT INTO clara_registry_project_access VALUES('other-w','other-p','a',true,true,true,NULL)");
 const otherScope={digest:digest('A'),workspaceId:'other-w',clientId:'other-c',projectId:'other-p',sessionId:'native:new'};
 const otherSid=String((await commands(otherScope,'create')).sessionId),otherRequest=request('A',otherSid,'other-c','other-p','other-w');
 assert.equal(await run(async()=>true,otherRequest,false),true);await assert.rejects(()=>run(()=>mail(),otherRequest));
 for(const [req,contact]of [[request(),'prospect-a'],[request('B',b),'prospect-b']] as const)await run(async()=>{const ctx=writableNativeContext();ctx.session.acquisitionSubmissionId=contact;const m={id:'new',title:'Authorized mail mission',objective:'Reply to the selected contact only',status:'planned' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};nativeMission(m);ctx.session.mission=m;},req);
 assert.deepEqual(((await run(()=>nativeMailCommand('list'),request(),false)).connections as Array<{id:string}>).map(c=>c.id),['mail-clara']);
 assert.deepEqual(((await run(()=>nativeMailCommand('list'),request('B',b),false)).connections as Array<{id:string}>).map(c=>c.id),['mail-gildas']);
 await assert.rejects(()=>run(()=>mail('mail-gildas')));await assert.rejects(()=>run(()=>mail(),request('B',b)));
 for(const r of [new Request('https://os.fixture.example'),request('invalid'),request('D'),request('B',a),request('A',a,'c1','p1','foreign-workspace')])await assert.rejects(()=>run(()=>mail(),r));
 await run(async()=>{await (await mail()).sync('INBOX');});let id='';await run(async()=>{id=String((await (await mail()).list()).messages[0].id);await (await mail()).bind(id);});
 // Synchronization repeats without duplicate rows. No contact inferred from From.
 await run(async()=>{await (await mail()).sync('INBOX');});assert.equal(Number(pg("SELECT COUNT(*) FROM clara_native_mail_messages WHERE connection_id='mail-clara'")),1);
 for(const r of [request('A',p2,'c1','p2'),request('A',p3,'c2','p3')]){await assert.rejects(()=>run(async()=>{await (await mail()).read(id);},r));await assert.rejects(()=>run(async()=>{await (await mail()).bind(id);},r));}
 const prompts:string[]=[];t.mock.method(OpenAIResponsesEngine.prototype,'generate',async(context:{prompt:string;instructions?:string;tools?:unknown[]})=>{prompts.push(context.instructions??context.prompt);assert.equal(context.tools,undefined);return {success:true,content:JSON.stringify({subject:'SAFE_REPLY',body:'Authorized response, please review.',sender:'attacker@example.invalid',send:true}),responseStatus:'completed'};});
 await run(async()=>{const r=await (await mail()).prepare(id,'en');assert.equal(r.draft.sender.email,'clara@melodie.digital');assert.deepEqual(r.draft.recipients,['correspondent@example.invalid']);});assert.ok(prompts.some(p=>p.includes('untrusted evidence')));assert.ok(prompts.some(p=>p.includes('same language, regardless of the Clara OS interface locale')));assert.equal(providerA.sent.length,0);
 await assert.rejects(()=>run(async()=>await (await mail()).saveDraft(id,{subject:'Attachment review',body:'Explicit reply',recipients:['recipient@example.invalid'],attachmentIds:['foreign-attachment']})));
 await run(async()=>await (await mail()).saveDraft(id,{subject:'Attachment review',body:'Explicit reply',recipients:['recipient@example.invalid'],attachmentIds:[attachmentId]}));
 const submit=()=>run(async()=>await (await mail()).submit());let operation=await submit();
 const approved=await run(async()=>await (await mail()).approve(operation.operationId));
 const frozen=await run(async()=>await (await mail()).review(operation.operationId),request(),false);assert.equal(Buffer.from(frozen.envelope.attachments[0].content,'base64').toString(),'APPROVED_NOTE');assert.equal(frozen.envelope.attachments[0].sha256,attachmentId);
 // Editing any envelope field invalidates approval by the current Mission hash.
 await run(async()=>{await (await mail()).saveDraft(id,{subject:'Changed',body:'Changed content',recipients:['other@example.invalid'],attachmentIds:[]});});
 await assert.rejects(()=>sendNativeMail(request(),'mail-clara',operation.operationId,approved.token,factory,query));assert.equal(providerA.sent.length,0);
 operation=await submit();const approval=await run(async()=>await (await mail()).approve(operation.operationId));
 const race=await Promise.allSettled([sendNativeMail(request(),'mail-clara',operation.operationId,approval.token,factory,query),sendNativeMail(request(),'mail-clara',operation.operationId,approval.token,factory,query)]);
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(providerA.sent.length,1);assert.equal(pg(`SELECT state FROM clara_native_mail_operations WHERE id='${operation.operationId}'`).trim(),'sent');
 await assert.rejects(()=>sendNativeMail(request(),'mail-clara',operation.operationId,approval.token,factory,query));assert.equal(providerA.sent.length,1);
 // Delegate can read/prepare, never approve/send as mailbox owner by admin role.
 await run(()=>nativeMailCommand('delegate',{connectionId:'mail-clara',userId:'b'}));await run(async()=>{assert.equal((await (await mail()).read(id)).subject,providerA.content.subject);},request('B',b),false);
 await assert.rejects(()=>run(async()=>{await (await mail()).approve(operation.operationId);},request('B',b)));
 await run(()=>nativeMailCommand('revokeDelegation',{connectionId:'mail-clara',userId:'b'}));await assert.rejects(()=>run(()=>mail(),request('B',b)));
 // Gildas is owned by B, independent credentials and approval. Delegated A
 // submits its private Mission draft explicitly; owner reviews only frozen mail.
 let gid='';await run(async()=>{await (await mail('mail-gildas')).sync('INBOX');},request('B',b));
 await run(async()=>{gid=String((await (await mail('mail-gildas')).list()).messages[0].id);await (await mail('mail-gildas')).bind(gid);await nativeMailCommand('delegate',{connectionId:'mail-gildas',userId:'a'});},request('B',b));
 // A uses its own existing contact and mission; no other user's Mission read.
 await run(async()=>{await (await mail('mail-gildas')).bind(gid);await (await mail('mail-gildas')).saveDraft(gid,{subject:'Gildas reply',body:'Owner must approve',recipients:['recipient@example.invalid'],attachmentIds:[]});});
 const go=await run(async()=>await (await mail('mail-gildas')).submit());await assert.rejects(()=>run(async()=>await (await mail('mail-gildas')).approve(go.operationId)));
 const ga=await run(async()=>await (await mail('mail-gildas')).approve(go.operationId),request('B',b));providerB.outcome='uncertain';
 const uncertain=await sendNativeMail(request('B',b),'mail-gildas',go.operationId,ga.token,factory,query);assert.equal(uncertain.state,'uncertain');assert.equal(providerB.sent.length,1);
 await assert.rejects(()=>sendNativeMail(request('B',b),'mail-gildas',go.operationId,ga.token,factory,query));assert.equal(providerB.sent.length,1);
 // Expired approval, failure before transmission, and ambiguous crash never retry.
 await run(async()=>await (await mail()).saveDraft(id,{subject:'Expiry',body:'Still requires approval',recipients:['recipient@example.invalid'],attachmentIds:[]}));const expired=await submit(),ea=await run(async()=>await (await mail()).approve(expired.operationId));pg(`UPDATE clara_tool_approvals SET expires_at=NOW()-INTERVAL '1 minute' WHERE call_id='${expired.operationId}'`);await assert.rejects(()=>sendNativeMail(request(),'mail-clara',expired.operationId,ea.token,factory,query));
 providerA.failSync=true;await assert.rejects(()=>run(async()=>await (await mail()).sync('INBOX')));providerA.failSync=false;
 providerA.uids=[];await assert.rejects(()=>run(async()=>await (await mail()).read(id)));await run(async()=>await (await mail()).sync('INBOX'));await assert.rejects(()=>run(async()=>await (await mail()).read(id)));
 providerA.uids=[2];providerA.validity='2';await run(async()=>await (await mail()).sync('INBOX'));assert.equal(Number(pg("SELECT COUNT(*) FROM clara_native_mail_messages WHERE connection_id='mail-clara' AND available")),1);
 const currentId=String((await run(async()=>await (await mail()).list(),request(),false)).messages[0].id);
 const oldContacts=Number(pg("SELECT COUNT(*) FROM clara_acquisition_records"));
 await run(async()=>await (await mail()).createContact(currentId,'Explicitly reviewed person','reviewed@example.invalid','fr'));
 assert.equal(Number(pg("SELECT COUNT(*) FROM clara_acquisition_records")),oldContacts+1);
 await assert.rejects(()=>run(async()=>await (await mail()).createContact(currentId,'Duplicate','reviewed@example.invalid','fr')));
 assert.throws(()=>pg("UPDATE clara_native_mail_authority SET owner_user_id='b',revision=revision+1 WHERE connection_id='mail-clara'"));
 // A transport failure before transmission is durably different from uncertainty.
 await run(async()=>await (await mail()).bind(currentId));
 await run(async()=>await (await mail()).saveDraft(currentId,{subject:'Before transmission failure',body:'No retry',recipients:['recipient@example.invalid'],attachmentIds:[]}));const failed=await submit(),fa=await run(async()=>await (await mail()).approve(failed.operationId));providerA.outcome='failed';assert.equal((await sendNativeMail(request(),'mail-clara',failed.operationId,fa.token,factory,query)).state,'failed');
 await run(async()=>await (await mail()).saveDraft(currentId,{subject:'Permissions revoked',body:'Must never transmit',recipients:['recipient@example.invalid'],attachmentIds:[]}));const revoked=await submit(),ra=await run(async()=>await (await mail()).approve(revoked.operationId));
 const sentBefore=providerA.sent.length;pg("UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE workspace_id='w' AND user_id='a' AND project_id='p1'");await assert.rejects(()=>sendNativeMail(request(),'mail-clara',revoked.operationId,ra.token,factory,query));assert.equal(providerA.sent.length,sentBefore);pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE workspace_id='w' AND user_id='a' AND project_id='p1'");
 await run(async()=>await (await mail()).saveDraft(currentId,{subject:'Crash after claim',body:'No automatic resend after interrupted attempt',recipients:['recipient@example.invalid'],attachmentIds:[]}));const crash=await submit(),ca=await run(async()=>await (await mail()).approve(crash.operationId));
 await run(async()=>await (await mail()).stageClaim(crash.operationId,ca.token,'synthetic-crash-attempt'));
 assert.equal(pg(`SELECT state FROM clara_native_mail_operations WHERE id='${crash.operationId}'`).trim(),'processing');await assert.rejects(()=>sendNativeMail(request(),'mail-clara',crash.operationId,ca.token,factory,query));
 await run(async()=>await (await mail()).saveDraft(currentId,{subject:'Uncertain cannot be bypassed',body:'New revision cannot bypass unresolved attempt',recipients:['recipient@example.invalid'],attachmentIds:[]}));await assert.rejects(()=>submit());
 // Real backup/restore and migration reapplication retain history and permissions.
 const operationCount=pg('SELECT COUNT(*) FROM clara_native_mail_operations').trim();assert.equal(operationCount,'7');
 const restore=db+'_restore';execFileSync('docker',['exec',container,'createdb','-U','postgres',restore]);try{const dump=execFileSync('docker',['exec',container,'pg_dump','-U','postgres',db]);execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',restore,'-q','-v','ON_ERROR_STOP=1'],{input:dump,stdio:'pipe'});migrate(restore);assert.equal(execFileSync('docker',['exec',container,'psql','-U','postgres','-d',restore,'-qAt','-c','SELECT COUNT(*) FROM clara_native_mail_operations'],{encoding:'utf8'}).trim(),operationCount);}finally{execFileSync('docker',['exec',container,'dropdb','-U','postgres',restore]);}
 await run(()=>nativeMailCommand('revoke',{connectionId:'mail-clara'}));await assert.rejects(()=>run(()=>mail()));
 assert.equal(Number(pg("SELECT COUNT(*) FROM clara_journal_entries WHERE entry->>'summary' LIKE 'MAIL_%'"))>10,true);
 const data=await commands({digest:digest('C'),workspaceId:'w',clientId:'c1',projectId:'p1',sessionId:a},'read');assert.ok((data.session as {mission:unknown}).mission);assert.ok(!JSON.stringify(data).includes('Still requires approval'));assert.ok(!JSON.stringify(data.journal).includes('UNTRUSTED_MAIL'));
});
