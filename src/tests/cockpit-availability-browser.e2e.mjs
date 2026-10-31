import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash,X509Certificate} from 'node:crypto';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!origin||!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Isolated runtime required');
const ui=JSON.parse(readFileSync('src/i18n/messages/fr/consolidated-ui.json','utf8'));
async function assertHeaderNavigation(page){
 const header=page.getByRole('banner');
 const search=header.getByRole('link',{name:ui.uiDocumentSearch,exact:true});
 const journal=header.getByRole('link',{name:ui.uiOpenJournal,exact:true});
 await search.waitFor();await journal.waitFor();
 assert.equal(await search.getAttribute('href'),'/documents#document-search');
 assert.equal(await journal.getAttribute('href'),'/journal');
 assert.equal(await header.getByRole('textbox',{name:'Rechercher',exact:true}).count(),0,'Do not restore an inactive global search');
 assert.equal(await header.getByRole('button',{name:'Notifications — Indisponible',exact:true}).count(),0,'The Journal link replaces the inactive notification button');
}
test('cockpit: real header navigation, native service refusals and durable chat recovery',async()=>{
 const response=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:'clara_auth_session='+'A'.repeat(43),origin,'Content-Type':'application/json'},body:JSON.stringify({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p2'})});
 assert.equal(response.status,200);const sessionId=(await response.json()).data.sessionId;const selection=response.headers.get('set-cookie').split(';')[0];
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const context=await browser.newContext({viewport:{width:1536,height:1000}});
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
  await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin},{name:'clara_native_selection',value:selection.slice(selection.indexOf('=')+1),url:origin}]);
  const created=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:'clara_auth_session='+'A'.repeat(43)+'; '+selection,origin,'Content-Type':'application/json'},body:JSON.stringify({action:'createMission',title:'COCKPIT_RECOVERY',objective:'Isolated UI receipt'})});assert.equal(created.status,200);
  const page=await context.newPage(),calls=[];page.on('request',r=>calls.push(new URL(r.url()).pathname));await page.goto(origin+'/');
  await assertHeaderNavigation(page);
  assert.equal(await page.getByText('⌘K',{exact:true}).count(),0);
  const talkButtons=page.getByRole('button',{name:/Parler/});
  assert.ok(await talkButtons.count()>0,'Historical voice widget stays visible');
  for(const button of await talkButtons.all())assert.equal(await button.isDisabled(),true,'Native voice remains fenced');
  // The historical voice control is visible but always disabled in native scope. Agenda may be legitimately available
  // when the selected native session has an attested Google connection/calendar.
  assert.ok(await page.getByText('Ce service externe reste indisponible dans le contexte natif tant que ses autorisations ne sont pas certifiées.',{exact:true}).count()>=1);
  // The authorized Agenda can legitimately call /api/calendar in this fixture;
  // native voice must never initiate an ElevenLabs session.
  assert.equal(calls.filter(p=>p==='/api/elevenlabs/session').length,0);
  // These are real navigation paths, not a global search or notification service.
  await page.getByRole('banner').getByRole('link',{name:ui.uiDocumentSearch,exact:true}).click();
  await page.waitForURL(origin+'/documents#document-search');
  const searchForm=page.locator('#document-search'),searchInput=searchForm.getByRole('textbox');
  await searchInput.waitFor();assert.equal(await searchInput.isEnabled(),true);
  const query='COCKPIT_AUTHORIZED_DOCUMENT_SEARCH';await searchInput.fill(query);
  const searched=page.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).pathname==='/api/documents'&&new URL(r.url()).searchParams.get('query')===query);
  await searchForm.getByRole('button',{name:'Rechercher',exact:true}).click();
  const result=await searched;assert.equal(result.status(),409);
  assert.equal((await result.json()).code,'NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED','Searching must not bypass the native Google selection');
  await page.getByText(/\[NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED\]/).first().waitFor();
  await page.getByRole('banner').getByRole('link',{name:ui.uiOpenJournal,exact:true}).click();
  await page.waitForURL(origin+'/journal');
  await page.locator('article').filter({hasText:'COCKPIT_RECOVERY'}).first().waitFor();
  await page.goto(origin+'/');
  await page.getByRole('link',{name:'Clara →',exact:true}).first().click();await page.waitForURL(origin+'/clara');
  await assertHeaderNavigation(page);
  for(const path of ['/missions','/conversations','/contacts','/connexions','/telephonie','/automatisations','/agenda','/documents','/journal','/brain','/clara','/']){
   await page.locator('aside a[href="'+path+'"]').click();await page.waitForURL(origin+path);assert.equal(new URL(page.url()).pathname,path);
  }
  await assertHeaderNavigation(page);
  const form=page.locator('form').filter({has:page.locator('textarea[placeholder]')}).last();let release;const committed=new Promise(resolve=>{release=resolve;});let operationId;
  await page.route('**/api/clara/chat',async route=>{const request=route.request(),body=request.postDataJSON();assert.equal(body.sessionId,sessionId);assert.ok(body.operationId);operationId=body.operationId;const committedResponse=await fetch(request.url(),{method:'POST',headers:await request.allHeaders(),body:request.postData()});assert.equal(committedResponse.status,200);await committedResponse.json();await route.abort('failed');release();});
  await form.locator('textarea').fill('COCKPIT_ACK_LOST');await form.locator('button[type="submit"]').click();await committed;
  await page.getByRole('alert').filter({hasText:'Un traitement est en cours'}).waitFor();
  const pending=await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)), 'clara.pending-chat:'+sessionId);assert.equal(pending.operationId,operationId);assert.equal(pending.sessionId,sessionId);
  await page.unroute('**/api/clara/chat');await page.reload();
  const [replayed]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'),page.getByRole('button',{name:'Vérifier la réponse',exact:true}).click()]);assert.equal(replayed.status(),200);assert.equal(replayed.headers()['x-clara-operation-replayed'],'1');
  const db=process.env.NATIVE_TEST_DATABASE;assert.match(db,/^native_browser_[a-f0-9]{32}$/);assert.match(sessionId,/^native:[a-f0-9-]+$/);
  const pg=sql=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:'pipe'}).trim();
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${sessionId}' AND message->>'content'='COCKPIT_ACK_LOST'`),'1');
  pg(`UPDATE clara_sessions SET data=data-'nativeMissionId' WHERE id='${sessionId}';UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp() WHERE resource_kind='session' AND resource_id='${sessionId}' AND revoked_at IS NULL;INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT 'session',id,'a','w','c1','p2',encode(sha256(convert_to(data::text,'UTF8')),'hex'),'a','Synthetic historical Cockpit fixture only' FROM clara_sessions WHERE id='${sessionId}'`);
  await page.reload();await page.getByRole('alert').filter({hasText:'Ce fil est conservé en lecture seule'}).waitFor();assert.ok(await page.locator('form').filter({has:page.locator('textarea[placeholder]')}).last().locator('textarea').isDisabled());

 }finally{await browser.close();}
});
