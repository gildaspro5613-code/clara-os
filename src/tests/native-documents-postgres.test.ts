import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import type {drive_v3} from 'googleapis';
import type {RegistryQuery} from '@/lib/canonical/registry';
import {withNativeScope,writableNativeContext,nativeMission,nativeCommands} from '@/lib/native/scoped-context';
import {nativeGoogleCommand,googleProofHash} from '@/lib/native/google-authority';
import {NativeDocuments} from '@/lib/native/documents';
import {syntheticPdf} from './helpers/synthetic-pdf';
import {OpenAIResponsesEngine} from '@/lib/connectors/internal/openai/responses/openai-responses-engine';
import {encryptCredentialPayload} from '@/lib/connections/credential-store';

test('native documentary continuity uses real Core/Brain/PDF and PostgreSQL; Google rights, canonical delegation, durable encrypted results and revocation',{skip:!process.env.CANONICAL_TEST_CONTAINER},async t=>{
 assert.equal(process.env.CANONICAL_TEST_CONTAINER,'clara-canonical-test-postgres');const db='native_browser_'+randomUUID().replaceAll('-','');
 execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-runtime-browser-fixture.mts',db],{stdio:['pipe','pipe','pipe']});t.after(()=>execFileSync('docker',['exec','clara-canonical-test-postgres','dropdb','-U','postgres',db]));
 const pg=(statement:string)=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',statement],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
 const migration=readFileSync('db/migrations/015_native_google_document_authority.sql');for(let i=0;i<2;i++)execFileSync('docker',['exec','-i','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:migration,stdio:['pipe','pipe','pipe']});
 const query:RegistryQuery=async(strings,...values)=>{const statement=strings.reduce((s,part,i)=>s+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');try{return pg(`SELECT row_to_json(r) FROM (${statement})r`).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch(e){throw {code:String((e as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}};
 const command=nativeCommands(query),scope=(user='A',clientId='c1',projectId='p1',sessionId='native:new')=>({digest:googleProofHash(user.repeat(43)),workspaceId:'w',clientId,projectId,sessionId});
 const sid=String((await command(scope(),'create')).sessionId),bid=String((await command(scope('B'),'create')).sessionId),p2=String((await command(scope('A','c1','p2'),'create')).sessionId),p3=String((await command(scope('A','c2','p3'),'create')).sessionId);
 process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 const request=(user='A',clientId='c1',projectId='p1',sessionId=sid)=>new Request('https://os.fixture.example/api?'+new URLSearchParams({workspaceId:'w',clientId,projectId,sessionId}),{headers:{cookie:'clara_auth_session='+user.repeat(43),origin:'https://os.fixture.example'}});
 const run=<T>(f:()=>Promise<T>,r=request(),write=true)=>withNativeScope(r,write,f,query);
 const begin=async(connectionId:string)=>{const nonce='nonce-'+connectionId,state='state-'+connectionId;await nativeGoogleCommand('begin',{connectionId,stateHash:googleProofHash(state),nonceHash:googleProofHash(nonce)});return {connectionId,stateHash:googleProofHash(state),nonceHash:googleProofHash(nonce)};};
 let transaction!:Awaited<ReturnType<typeof begin>>;
 await run(async()=>{const ctx=writableNativeContext();ctx.session.acquisitionSubmissionId='prospect-a';const mission={id:'new',title:'Documentary commercial mission',objective:'Use an authorized document without sending',status:'planned' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};nativeMission(mission);ctx.session.mission=mission;transaction=await begin('google-owned');
  await nativeGoogleCommand('finish',{...transaction,issuer:'https://accounts.google.com',subject:'google-a',encryptedPayload:encryptCredentialPayload({accessToken:'synthetic',refreshToken:'synthetic'})});ctx.session.googleConnectionId='google-owned';
 });
 await assert.rejects(()=>run(()=>nativeGoogleCommand('finish',{...transaction,issuer:'https://accounts.google.com',subject:'google-a',encryptedPayload:'invalid'})));
 await assert.rejects(()=>run(()=>nativeGoogleCommand('authority',{connectionId:'google-owned'}),request('B','c1','p1',bid)));
 // Unowned history is never adopted. A reviewed project manager selects explicit IDs.
 pg("INSERT INTO clara_connections(id,workspace_id,provider,status) VALUES('historical-global','w','google','ACTIVE')");await assert.rejects(()=>run(()=>nativeGoogleCommand('authority',{connectionId:'historical-global'})));
 let rights=true,version='1',permission='permission-a',principal='google-a',changeOnRead=false,reads=0;const text='LOT2_AUTHORIZED_PDF A capacity of 800 places; stage opening 10m.';
 const drive={context:{_options:{auth:{request:async()=>({data:{sub:principal}})}}},about:{get:async()=>({data:{user:{permissionId:'permission-a'}}})},permissions:{list:async()=>({data:{permissions:rights?[{id:permission,role:'reader',type:'user'}]:[]}})},files:{get:async(params:{fileId:string;alt?:string})=>{if(params.alt){reads++;if(changeOnRead)version='concurrent-version';return {data:Readable.from([syntheticPdf(text)])};}return {data:{id:params.fileId,name:'Authorized shared PDF',mimeType:'application/pdf',size:'1000',version,capabilities:{canDownload:rights},trashed:false}};}}} as unknown as drive_v3.Drive;
 const docs=()=>new NativeDocuments('google-owned',async()=>drive).initialize();const prompts:string[]=[];
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async(context:{prompt:string})=>{prompts.push(context.prompt);return {success:true,content:'Capacity: 800 places; no external action.',responseStatus:'completed'};});
 await run(async()=>{const d=await docs();assert.equal((await d.inspect('document-a')).file.version,'1');await d.bind('document-a','1');assert.equal((await d.list('shared')).files.length,1);assert.equal((await d.authorize('document-a')).readAllowed,true);const downloaded=await d.download('document-a');assert.equal(downloaded.status,200);assert.ok((await downloaded.arrayBuffer()).byteLength>100);const result=await d.read('document-a','What capacity is available?','en');assert.match(result.textContent,/LOT2_AUTHORIZED_PDF/);assert.ok(result.brain.recommendation);assert.match(result.analysis.answer,/800/);});
 assert.equal(reads,2);assert.ok(prompts.some(p=>p.includes('LOT2_AUTHORIZED_PDF')));assert.ok(prompts.every(p=>!p.includes('PRIVATE_prospect-b')&&!p.includes('PRIVATE_prospect-p2')&&!p.includes('PRIVATE_prospect-p3')));
 const raw=await command(scope('A','c1','p1',sid),'read');assert.equal((raw.journal as unknown[]).length,1);assert.equal((raw.session as {mission:{title:string}}).mission.title,'Documentary commercial mission');assert.ok(!JSON.stringify(raw).includes('LOT2_AUTHORIZED_PDF'));assert.ok(!JSON.stringify(raw).includes('Capacity: 800 places'));
 await run(async()=>{const saved=await (await docs()).references();assert.equal(saved.references[0].available,true);assert.ok(JSON.stringify(saved).includes('800 places'));},request(),false);
 await assert.rejects(()=>run(async()=>{await (await docs()).read('unbound-history');}));
 // Having management rights in two projects is NOT permission to redeclare
 // the same canonical document in the second project or change its owner.
 await run(async()=>{const ctx=writableNativeContext();const mission={id:'new',title:'Independent P2 mission',objective:'No document reassignment',status:'planned' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};nativeMission(mission);ctx.session.mission=mission;},request('A','c1','p2',p2));
 await assert.rejects(()=>run(async()=>{await (await docs()).bind('document-a','1');},request('A','c1','p2',p2)));
 await assert.rejects(()=>run(async()=>{await (await docs()).inspect('document-a');},request('A','c1','p2',p2)));
 await run(async()=>{const ctx=writableNativeContext();const mission={id:'new',title:'Independent B mission',objective:'No ownership reassignment',status:'planned' as const,priority:'medium' as const,createdAt:new Date(),tasks:[],progress:0};nativeMission(mission);ctx.session.mission=mission;},request('B','c1','p1',bid));
 principal='google-b';await assert.rejects(()=>run(async()=>{await (await new NativeDocuments('foreign-google-b',async()=>drive).initialize()).bind('document-a','1');},request('B','c1','p1',bid)));principal='google-a';

 for(const r of [request('A','c1','p2',p2),request('A','c2','p3',p3)])await run(async()=>{assert.deepEqual((await (await docs()).list()).files,[]);await assert.rejects(()=>(async()=>{await (await docs()).read('document-a');})());},r);
 rights=false;await run(async()=>{assert.deepEqual((await (await docs()).list()).files,[]);assert.equal((await (await docs()).references()).references[0].available,false);await assert.rejects(()=>(async()=>{await (await docs()).read('document-a');})());});rights=true;
 version='2';await run(async()=>{assert.equal((await (await docs()).references()).references[0].available,false);await assert.rejects(()=>(async()=>{await (await docs()).read('document-a');})());await (await docs()).bind('document-a','2');await (await docs()).read('document-a');const revisions=await (await docs()).references();assert.ok(revisions.references.some(r=>r.version==='2'&&r.available));assert.ok(revisions.references.some(r=>r.version==='1'&&!r.available));});
 // Explicit delegation is project-specific and revocable; no inference from contacts.
 await run(()=>nativeGoogleCommand('delegate',{connectionId:'google-owned',userId:'b'}));
 await run(async()=>{assert.equal((await (await docs()).list()).files.length,1);},request('B','c1','p1',bid),false);
 await run(()=>nativeGoogleCommand('revokeDelegation',{connectionId:'google-owned',userId:'b'}));await assert.rejects(()=>run(()=>nativeGoogleCommand('authority',{connectionId:'google-owned'}),request('B','c1','p1',bid),false));
 principal='google-b';await run(async()=>{await assert.rejects(()=>(async()=>{await (await docs()).read('document-a');})());});principal='google-a';
 changeOnRead=true;await assert.rejects(()=>run(async()=>{await (await docs()).read('document-a');}));changeOnRead=false;version='2';
 permission='someone-else';await run(async()=>{await assert.rejects(()=>(async()=>{await (await docs()).read('document-a');})());});permission='permission-a';
 // Two analyses start from the SAME real Session snapshot, then overlap at the
 // composer. The PostgreSQL CAS must accept exactly one complete result/Journal.
 let arrivals=0,release!:()=>void;const gate=new Promise<void>(r=>release=r);
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async(context:{prompt:string})=>{if(context.prompt.includes('Tu es Clara, la présence conversationnelle de Clara OS.')){if(++arrivals===2)release();await gate;}return {success:true,content:'Concurrent analysis 800 places',responseStatus:'completed'};});
 const race=await Promise.allSettled([run(async()=>{await (await docs()).read('document-a');}),run(async()=>{await (await docs()).read('document-a');})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.filter(r=>r.status==='rejected').length,1);assert.equal((race.find(r=>r.status==='rejected') as PromiseRejectedResult).reason.status,409);
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async()=>({success:true,content:'800 places',responseStatus:'completed'}));
 // Local backup/restore of BOTH business history and authority, then reapplication.
 const restore=db+'_restore';execFileSync('docker',['exec','clara-canonical-test-postgres','createdb','-U','postgres',restore]);
 try{const dump=execFileSync('docker',['exec','clara-canonical-test-postgres','pg_dump','-U','postgres',db]);execFileSync('docker',['exec','-i','clara-canonical-test-postgres','psql','-U','postgres','-d',restore,'-q','-v','ON_ERROR_STOP=1'],{input:dump,stdio:['pipe','pipe','pipe']});execFileSync('docker',['exec','-i','clara-canonical-test-postgres','psql','-U','postgres','-d',restore,'-q','-v','ON_ERROR_STOP=1'],{input:migration,stdio:['pipe','pipe','pipe']});const restored=execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',restore,'-qAt','-c',`SELECT clara_native_read_session('${scope().digest}','w','c1','p1','${sid}') IS NOT NULL`],{encoding:'utf8'});assert.equal(restored.trim(),'t');}finally{execFileSync('docker',['exec','clara-canonical-test-postgres','dropdb','-U','postgres',restore]);}
 const before=pg(`SELECT data::text FROM clara_sessions WHERE id='${sid}'`).trim();
 await assert.rejects(()=>run(async()=>{const d=await docs();await d.read('document-a');await nativeGoogleCommand('revoke',{connectionId:'google-owned'});}));assert.equal(pg(`SELECT data::text FROM clara_sessions WHERE id='${sid}'`).trim(),before);
 await assert.rejects(()=>run(()=>nativeGoogleCommand('authority',{connectionId:'google-owned'})));
 for(const r of [new Request('https://os.fixture.example/api'),request('D'),request('B','c1','p1',sid)])await assert.rejects(()=>run(async()=>{},r,false));
 const role='lot2_'+randomUUID().replaceAll('-','');pg('CREATE ROLE '+role);
 try{
  assert.match(pg(`SELECT has_function_privilege('${role}','clara_native_google_command(text,text,text,text,text,text,jsonb)','EXECUTE')`),/f/);
  pg(`GRANT USAGE ON SCHEMA public TO ${role};GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${role};GRANT EXECUTE ON FUNCTION clara_native_google_command(text,text,text,text,text,text,jsonb),clara_native_runtime_command(text,text,text,text,text,text,jsonb),clara_native_read_session(text,text,text,text,text),clara_native_acquisition_snapshot(text,text) TO ${role}`);
  const invoke=(operation:string,payload:object={})=>`SET ROLE ${role};SELECT clara_native_google_command('${scope().digest}','w','c1','p1','${sid}','${operation}','${JSON.stringify(payload).replaceAll("'","''")}'::jsonb);RESET ROLE`;
  assert.throws(()=>pg(invoke('list')),/permission denied/,'SELECT alone does not permit the existing authorization locks');
  // Broad grants are restricted to this throwaway fixture database. Production
  // grants must be reviewed per table/column for the trusted application role.
  pg(`GRANT INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO ${role}`);
  assert.ok(pg(invoke('list')).includes('connections'));
  assert.ok(pg(invoke('begin',{connectionId:'role-owned-google',stateHash:googleProofHash('role-state'),nonceHash:googleProofHash('role-nonce')})).includes('role-owned-google'));
 }finally{pg('DROP OWNED BY '+role);pg('DROP ROLE '+role);}
});
