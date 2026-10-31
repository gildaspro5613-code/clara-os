import {nativeChatCommands} from '../lib/native/chat.ts';
import {nativeSelectors} from '../lib/native/authority.ts';
import {X509Certificate,createHash,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {withNativeScope,writableNativeContext} from '../lib/native/scoped-context.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Isolated native fixture only');
const pg=statement=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',statement],{encoding:'utf8',stdio:'pipe'});
const query=async(strings,...values)=>{const statement=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');return pg(`SELECT row_to_json(r) FROM (${statement})r`).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));};
test('native conversation UI: immutable Mission/client, lost acknowledgement + refresh, concurrent replay and paginated durable history without Live',async()=>{
 process.env.CLARA_AUTH_APP_ORIGIN=origin;
 const auth='clara_auth_session='+'A'.repeat(43)+'; NEXT_LOCALE=fr';
 const call=(cookie,path,body)=>fetch(origin+path,{method:body?'POST':'GET',headers:{cookie,...(body?{origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const create=async(clientId='c1',projectId='p2')=>{const r=await call(auth,'/api/native/runtime',{action:'createSession',workspaceId:'w',clientId,projectId});assert.equal(r.status,200);return {cookie:auth+'; '+r.headers.get('set-cookie').split(';')[0],...(await r.json()).data};};
 const a=await create(),b=await create();
 const mission=async(scope,title)=>{const r=await call(scope.cookie,'/api/native/runtime',{action:'createMission',title,objective:title});assert.equal(r.status,200,await r.clone().text());return (await r.json()).mission.id;};
 const ma=await mission(a,'LOT4BIS_MISSION_A'),mb=await mission(b,'LOT4BIS_MISSION_B');
 assert.equal((await call(a.cookie,'/api/clara/chat',{operationId:randomUUID(),message:'LOT4BIS_TURN_A',sessionId:a.sessionId})).status,200);
 assert.equal((await call(a.cookie,'/api/native/runtime',{action:'createMission',title:'MUST_NOT_CREATE_B',objective:'No reassignment'})).status,409);
 assert.equal((await call(a.cookie,'/api/native/runtime',{action:'selectMission',missionId:mb})).status,409);
 // a and b are different threads of the SAME authenticated user/project.
 // The native registry may expose both authorized missions, never B's history
 // or a silent reassignment of the mission bound to thread a.
 assert.equal((await call(b.cookie,'/api/clara/chat',{operationId:randomUUID(),message:'LOT4BIS_THREAD_B_ONLY',sessionId:b.sessionId})).status,200);
 const currentView=await (await call(a.cookie,'/api/native/runtime')).json(),current=currentView.session;
 assert.deepEqual(currentView.data,{workspaceId:'w',clientId:'c1',projectId:'p2',sessionId:a.sessionId});
 assert.equal(current.mission.id,ma);assert.equal(current.nativeMissionId,ma);
 assert.equal(current.brainDashboard.context.sessionId,a.sessionId);
 for(const [key,value] of Object.entries({workspaceId:'w',clientId:'c1',projectId:'p2'}))assert.equal(current.brainDashboard.context.metadata[key],value);
 const allowed=new Map(currentView.missions.map(m=>[m.id,m.title]));assert.equal(allowed.get(ma),'LOT4BIS_MISSION_A');assert.equal(allowed.get(mb),'LOT4BIS_MISSION_B');
 for(const sources of [current.sources,current.brainDashboard.sources]){
  const registry=sources.filter(source=>source.source==='native-missions');assert.equal(registry.length,1);assert.equal(registry[0].available,true);
  const data=registry[0].data;assert.deepEqual(data.scope,currentView.data);assert.equal(data.selectedMissionId,ma);
  assert.equal(data.totalAuthorized,allowed.size);assert.equal(data.partial,false);
  assert.deepEqual(data.missions.map(m=>m.id).sort(),[...allowed.keys()].sort());
  for(const m of data.missions)assert.equal(m.title,allowed.get(m.id),'Registry entries must match the SQL-authorized view');
  assert.ok(data.missions.some(m=>m.id===mb&&m.title==='LOT4BIS_MISSION_B'&&m.objective==='LOT4BIS_MISSION_B'));
  const {source,policy,...summary}=JSON.parse(registry[0].summary);assert.equal(source,'native-missions');assert.equal(typeof policy,'string');assert.deepEqual(summary,data);
  assert.ok(sources.filter(source=>source.source!=='native-missions').every(source=>!JSON.stringify(source).includes('LOT4BIS_MISSION_B')));
 }
 const {sources:registrySources,brainDashboard,...thread}=current;assert.ok(registrySources);
 const {sources:brainSources,...brain}=brainDashboard;assert.ok(brainSources);
 assert.ok(!JSON.stringify({thread,brain}).includes('LOT4BIS_MISSION_B'),'The sibling mission is read context only, never a reassignment of this thread');
 assert.ok(!JSON.stringify(current).includes('LOT4BIS_THREAD_B_ONLY'),'Sibling conversation content must not enter this thread or its Brain context');
 const sibling=(await (await call(b.cookie,'/api/native/runtime')).json()).session;assert.equal(sibling.mission.id,mb);assert.equal(sibling.nativeMissionId,mb);
 assert.ok(sibling.conversation.some(m=>m.content==='LOT4BIS_THREAD_B_ONLY'));assert.ok(!JSON.stringify(sibling.conversation).includes('LOT4BIS_TURN_A'));
 assert.equal((await call(a.cookie.replace('A'.repeat(43),'B'.repeat(43)),'/api/native/runtime')).status,403,'Another canonical user cannot read thread a');
 const otherClient=await create('c2','p3');assert.equal((await call(otherClient.cookie,'/api/native/runtime',{action:'selectMission',missionId:ma})).status,403);
 for(const scope of [otherClient,await create('c1','p1')]){const isolated=await (await call(scope.cookie,'/api/native/runtime')).json();assert.ok(isolated.missions.every(m=>m.id!==ma&&m.id!==mb));assert.ok(!JSON.stringify(isolated.session).includes('LOT4BIS_MISSION_B'));assert.ok(!JSON.stringify(isolated.session).includes('LOT4BIS_THREAD_B_ONLY'));}
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
  const select=async cookie=>{await ctx.clearCookies();await ctx.addCookies(cookie.split('; ').map(pair=>{const n=pair.indexOf('=');return {name:pair.slice(0,n),value:pair.slice(n+1),url:origin};}));};
  await select(a.cookie);const page=await ctx.newPage();await page.goto(origin+'/clara');
  let acknowledged;const committed=new Promise(r=>{acknowledged=r;});
  await page.route('**/api/clara/chat',async route=>{const req=route.request();const response=await fetch(req.url(),{method:'POST',headers:await req.allHeaders(),body:req.postData()});assert.equal(response.status,200,await response.clone().text());await response.json();await route.abort('failed');acknowledged();});
  const form=page.locator('form').filter({has:page.locator('textarea[placeholder]')}).last();await form.locator('textarea').fill('LOT4BIS_ACK_LOST');await form.locator('button[type="submit"]').click();await committed;
  await page.getByRole('alert').filter({hasText:'Un traitement est en cours'}).waitFor();await page.unroute('**/api/clara/chat');
  const journalBefore=pg(`SELECT count(*) FROM clara_native_journal_scope WHERE session_id='${a.sessionId}'`);
  await page.reload();await page.getByRole('button',{name:'Vérifier la réponse',exact:true}).waitFor();
  const [replayed]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'),page.getByRole('button',{name:'Vérifier la réponse',exact:true}).click()]);assert.equal(replayed.status(),200);assert.equal(replayed.headers()['x-clara-operation-replayed'],'1');
  await page.getByRole('button',{name:'Vérifier la réponse',exact:true}).waitFor({state:'hidden'});
  assert.equal(pg(`SELECT count(*) FROM clara_native_journal_scope WHERE session_id='${a.sessionId}'`),journalBefore);
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${a.sessionId}' AND message->>'role'='user' AND message->>'content'='LOT4BIS_ACK_LOST'`).trim(),'1');
  const body={operationId:randomUUID(),message:'LOT4BIS_CONCURRENT',sessionId:a.sessionId};const concurrent=await Promise.all([call(a.cookie,'/api/clara/chat',body),call(a.cookie,'/api/clara/chat',body)]);assert.ok(concurrent.every(r=>[200,202].includes(r.status)));
  assert.equal((await call(a.cookie,'/api/clara/chat',body)).status,200);assert.equal((await call(a.cookie,'/api/clara/chat',{...body,message:'Changed input'})).status,409);
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${a.sessionId}' AND message->>'role'='user' AND message->>'content'='LOT4BIS_CONCURRENT'`).trim(),'1');
  const abandoned={operationId:randomUUID(),message:'Abandoned process',sessionId:a.sessionId};
  await nativeChatCommands(query)(nativeSelectors(new Request(origin+'/api/native/runtime',{headers:{cookie:a.cookie,origin}})),'reserve',abandoned);
  await page.evaluate(([key,value])=>sessionStorage.setItem(key,value),['clara.pending-chat:'+a.sessionId,JSON.stringify(abandoned)]);await page.reload();
  await page.getByRole('button',{name:'Abandonner ce tour',exact:true}).waitFor();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Abandonner ce tour',exact:true}).click();await page.getByRole('button',{name:'Abandonner ce tour',exact:true}).waitFor({state:'hidden'});
  assert.equal((await call(a.cookie,'/api/clara/chat',abandoned)).status,409);
  const history=await create();await mission(history,'LOT4BIS_HISTORY');
  await withNativeScope(new Request(origin+'/api/native/runtime',{headers:{cookie:history.cookie,origin}}),true,async()=>{writableNativeContext().session.conversation=Array.from({length:104},(_,i)=>({id:'lot4bis-history-'+i,role:i%2?'clara':'user',content:i===0?'LOT4BIS_EARLIEST':'LOT4BIS_HISTORY_'+i,createdAt:new Date().toISOString()}));},query);
  assert.equal((await call(history.cookie,'/api/clara/chat',{operationId:randomUUID(),message:'LOT4BIS_AFTER_100',sessionId:history.sessionId})).status,200);
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${history.sessionId}'`).trim(),'106');
  const window=(await (await call(history.cookie,'/api/native/runtime')).json()).session.conversation;assert.equal(window.length,100);
  await select(history.cookie);await page.goto(origin+'/conversations');assert.ok(!(await page.locator('body').innerText()).includes('LOT4BIS_EARLIEST'));
  await page.getByRole('button',{name:'Afficher les messages précédents',exact:true}).click();await page.locator('[data-native-earlier-messages]').getByText('LOT4BIS_EARLIEST',{exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Afficher les messages précédents',exact:true}).click();await page.locator('[data-native-earlier-messages]').getByText('LOT4BIS_EARLIEST',{exact:true}).waitFor();
  await ctx.addCookies([{name:'clara_auth_session',value:'E'.repeat(43),url:origin}]);await page.reload();await page.getByRole('button',{name:'Afficher les messages précédents',exact:true}).click();await page.locator('[data-native-earlier-messages]').getByText('LOT4BIS_EARLIEST',{exact:true}).waitFor();
  assert.equal((await call(history.cookie,'/api/clara/conversation?thread='+encodeURIComponent(a.sessionId))).status,409);
  assert.equal((await call('clara_auth_session=invalid','/api/clara/conversation?thread='+encodeURIComponent(history.sessionId))).status,401);
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');await ctx.close();
 }finally{await browser.close();}
});
