import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {X509Certificate,createHash,randomUUID} from 'node:crypto';
import {nativeContext} from '../lib/native/scoped-context.ts';
import {saveSession} from '../lib/core/store/session-store.ts';
import {nativeChatRequest,nativeChatCommands} from '../lib/native/chat.ts';
import {nativeSelectors} from '../lib/native/authority.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE,before=process.env.CHAT_RECOVERY_BEFORE==='1';
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Isolated native fixture required');
const pg=sql=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:'pipe'}).trim();
const query=async(strings,...values)=>{const sql=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');return pg(`SELECT row_to_json(r) FROM (${sql})r`).split('\n').filter(Boolean).map(v=>JSON.parse(v));};
test('operational recovery #252: successive turns, lost receipt, reload, protected pending and confirmed abandonment',{timeout:120000},async()=>{
 process.env.CLARA_AUTH_APP_ORIGIN=origin;
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 const evidence='docs/recovery-252-20261106';mkdirSync(evidence,{recursive:true});
 try{
  const c=await browser.newContext();await c.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const created=await c.request.post(origin+'/api/native/runtime',{headers:{origin},data:{action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'}});assert.equal(created.status(),200);const scope=(await created.json()).data;
  const page=await c.newPage();await page.goto(origin+'/clara');const form=page.locator('form').filter({has:page.locator('textarea[placeholder]')}).last(),input=form.locator('textarea');
  const unlocked=()=>page.waitForFunction(()=>{const el=document.querySelector('textarea[placeholder]');return el&&!el.disabled;});
  async function turn(message){await unlocked();await input.fill(message);const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'&&r.request().method()==='POST');await form.locator('button[type=submit]').click();assert.equal((await response).status(),200);await unlocked();}
  const fixturePath='/tmp/native-fixture-google-state-'+db;const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));fixture.chatRecoveryContextProbe=true;writeFileSync(fixturePath,JSON.stringify(fixture));
  for(const message of ['Bonjour Clara.','Quel est le sujet de notre échange ?','Peux-tu rappeler le contexte de cette conversation ?'])await turn(message);
  assert.ok(readFileSync('/tmp/native-fixture-chat-context-'+db,'utf8').trim().split('\n').map(v=>JSON.parse(v)).some(v=>v.composer&&v.hasGreeting&&v.hasPriorQuestion),'Prior turns reach the real composer input');
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${scope.sessionId}'`),'6');
  assert.equal(pg(`SELECT data->'mission' IS NULL OR data->'mission'='null'::jsonb FROM clara_sessions WHERE id='${scope.sessionId}'`),'t');
  let lost=false;let committed;const lostReceipt=new Promise(resolve=>{committed=resolve;});
  await page.route('**/api/clara/chat',async route=>{
   if(route.request().method()!=='POST'||lost)return route.continue();lost=true;
   const request=route.request(),response=await fetch(request.url(),{method:'POST',headers:await request.allHeaders(),body:request.postData()});assert.equal(response.status,200);await response.json();await route.abort('failed');committed();
  });
  await input.fill('RECEIPT_RECOVERY_FIXTURE');await form.locator('button[type=submit]').click();await lostReceipt;
  await page.unroute('**/api/clara/chat');await page.reload();
  const jobComplete=pg(`SELECT count(*) FROM clara_external_event_jobs WHERE scope_key='native-chat:${scope.sessionId}' AND status='completed'`);assert.equal(jobComplete,'4');
  if(before){
   await page.getByRole('button',{name:'Vérifier la réponse',exact:true}).waitFor();assert.equal(await input.isDisabled(),true);
   writeFileSync(evidence+'/before.json',JSON.stringify({threeTurns:3,messages:8,serverCompleted:true,uiLockedAfterReload:true,providerSimulated:true},null,2)+'\n');await page.screenshot({path:evidence+'/before.png'});return;
  }
  await unlocked();assert.equal(await page.getByRole('button',{name:'Vérifier la réponse',exact:true}).count(),0);
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${scope.sessionId}'`),'8');
  await turn('La conversation peut continuer dans le même fil.');
  const stateFile='/tmp/native-fixture-google-state-'+db;
  const state=JSON.parse(readFileSync(stateFile,'utf8'));state.chatIncompleteFixture=true;writeFileSync(stateFile,JSON.stringify(state));
  await input.fill('INCOMPLETE_PROVIDER_FIXTURE');const failed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'&&r.request().method()==='POST');await form.locator('button[type=submit]').click();
  const terminal=await failed;assert.equal(terminal.status(),502);assert.equal(terminal.headers()['x-clara-operation-completed'],'1');await unlocked();
  state.chatIncompleteFixture=false;writeFileSync(stateFile,JSON.stringify(state));await turn('Je poursuis après une réponse interrompue.');
  const cookies=(await c.cookies()).map(v=>v.name+'='+v.value).join('; '),nativeScope=nativeSelectors(new Request(origin+'/api/native/runtime',{headers:{cookie:cookies,origin}}));
  const inProgress={operationId:randomUUID(),sessionId:scope.sessionId,message:'IN_FLIGHT_202_FIXTURE'};
  let enter,release;const entered=new Promise(resolve=>{enter=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  const ownerRequest=nativeChatRequest(new Request(origin+'/api/clara/chat',{method:'POST',headers:{cookie:cookies,origin,'Content-Type':'application/json'},body:JSON.stringify(inProgress)}),async()=>{
   enter();await gate;const current=nativeContext().session;
   current.conversation.push({id:randomUUID(),role:'user',content:inProgress.message,createdAt:new Date().toISOString()},{id:randomUUID(),role:'clara',content:'IN_FLIGHT_COMPLETED_FIXTURE',createdAt:new Date().toISOString()});
   await saveSession(current,scope.sessionId);return Response.json({success:true,message:'IN_FLIGHT_COMPLETED_FIXTURE'});
  },query);
  await entered;
  await page.evaluate(([key,value])=>sessionStorage.setItem(key,value),['clara.pending-chat:'+scope.sessionId,JSON.stringify(inProgress)]);
  const pendingResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'&&r.status()===202);
  await page.reload();assert.equal((await pendingResponse).headers()['x-clara-operation-completed'],undefined);assert.equal(await input.isDisabled(),true);
  release();assert.equal((await ownerRequest).status,200);await unlocked();await page.getByText('IN_FLIGHT_COMPLETED_FIXTURE',{exact:true}).waitFor();
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${scope.sessionId}' AND message->>'content'='IN_FLIGHT_COMPLETED_FIXTURE'`),'1');
  const pending={operationId:randomUUID(),sessionId:scope.sessionId,message:'PENDING_PROTECTED_FIXTURE'};
  const owner=await nativeChatCommands(query)(nativeScope,'reserve',pending);
  await page.evaluate(([key,value])=>sessionStorage.setItem(key,value),['clara.pending-chat:'+scope.sessionId,JSON.stringify(pending)]);
  await page.reload();await page.getByRole('button',{name:'Abandonner ce tour',exact:true}).waitFor();assert.equal(await input.isDisabled(),true);
  assert.equal(pg(`SELECT status FROM clara_external_event_jobs WHERE job_id='${owner.jobId}'`),'processing');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Abandonner ce tour',exact:true}).click();await unlocked();
  await assert.rejects(()=>nativeChatCommands(query)(nativeScope,'finish',{jobId:owner.jobId,ownerToken:owner.ownerToken,result:{status:200,body:{success:true,message:'LATE_FORBIDDEN'}}}));
  await turn('Après un abandon confirmé, je peux poursuivre ici.');
  const foreign=await c.request.post(origin+'/api/native/runtime',{headers:{origin},data:{action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p2'}});assert.equal(foreign.status(),200);await page.goto(origin+'/clara');assert.equal(await page.getByText('RECEIPT_RECOVERY_FIXTURE',{exact:true}).count(),0);
  const denied=await c.request.get(origin+'/api/clara/conversation?'+new URLSearchParams({thread:scope.sessionId}));assert.equal(denied.status(),409);
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${scope.sessionId}' AND message->>'content'='LATE_FORBIDDEN'`),'0');
  writeFileSync(evidence+'/after.json',JSON.stringify({threeTurns:3,messagesAfterLostAck:8,recoveredWithoutNewThread:true,completed202Recovered:true,pendingProtected:true,lateFinishRejected:true,projectIsolation:true,providerSimulated:true},null,2)+'\n');
  await page.screenshot({path:evidence+'/after.png'});
 }finally{await browser.close();}
});
