import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash,X509Certificate} from 'node:crypto';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!origin||!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Isolated runtime required');
test('cockpit: unavailable header controls and native Hero services cannot initiate fictitious actions',async()=>{
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
  assert.ok(await page.getByRole('textbox',{name:'Rechercher',exact:true}).isDisabled());
  assert.ok(await page.getByRole('button',{name:'Notifications — Indisponible',exact:true}).isDisabled());
  assert.equal(await page.getByText('⌘K',{exact:true}).count(),0);
  const talkButtons=await page.getByRole('button',{name:/Parler/}).evaluateAll(nodes=>nodes.map(node=>({label:node.getAttribute('aria-label'),text:node.textContent?.trim().slice(0,100),outerHTML:node.outerHTML.slice(0,450)})));
  assert.deepEqual(talkButtons,[],`Unexpected native voice control: ${JSON.stringify(talkButtons)}`);
  assert.ok(await page.getByText('Ce service externe reste indisponible dans le contexte natif tant que ses autorisations ne sont pas certifiées.',{exact:true}).count()>=2);
  assert.equal(calls.filter(p=>p==='/api/calendar'||p==='/api/elevenlabs/session').length,0);
  await page.getByRole('link',{name:'Clara →',exact:true}).first().click();await page.waitForURL(origin+'/clara');
  assert.ok(await page.getByRole('textbox',{name:'Rechercher',exact:true}).isDisabled());
  for(const path of ['/missions','/conversations','/contacts','/connexions','/telephonie','/automatisations','/agenda','/documents','/journal','/brain','/clara','/']){
   await page.locator('aside a[href="'+path+'"]').click();await page.waitForURL(origin+path);assert.equal(new URL(page.url()).pathname,path);
  }
  const unknownSearch=page.getByRole('textbox',{name:'Rechercher',exact:true});assert.ok(await unknownSearch.isDisabled());
  const form=page.locator('form').filter({has:page.locator('input[placeholder]')}).last();let release;const committed=new Promise(resolve=>{release=resolve;});let operationId;
  await page.route('**/api/clara/chat',async route=>{const request=route.request(),body=request.postDataJSON();assert.equal(body.sessionId,sessionId);assert.ok(body.operationId);operationId=body.operationId;const committedResponse=await fetch(request.url(),{method:'POST',headers:await request.allHeaders(),body:request.postData()});assert.equal(committedResponse.status,200);await committedResponse.json();await route.abort('failed');release();});
  await form.locator('input').fill('COCKPIT_ACK_LOST');await form.locator('button[type="submit"]').click();await committed;
  await page.getByRole('alert').filter({hasText:'Un traitement est en cours'}).waitFor();
  const pending=await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)), 'clara.pending-chat:'+sessionId);assert.equal(pending.operationId,operationId);assert.equal(pending.sessionId,sessionId);
  await page.unroute('**/api/clara/chat');await page.reload();
  const [replayed]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'),page.getByRole('button',{name:'Vérifier la réponse',exact:true}).click()]);assert.equal(replayed.status(),200);assert.equal(replayed.headers()['x-clara-operation-replayed'],'1');
  const db=process.env.NATIVE_TEST_DATABASE;assert.match(db,/^native_browser_[a-f0-9]{32}$/);assert.match(sessionId,/^native:[a-f0-9-]+$/);
  const pg=sql=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:'pipe'}).trim();
  assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${sessionId}' AND message->>'content'='COCKPIT_ACK_LOST'`),'1');
  pg(`UPDATE clara_sessions SET data=data-'nativeMissionId' WHERE id='${sessionId}';UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp() WHERE resource_kind='session' AND resource_id='${sessionId}' AND revoked_at IS NULL;INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) SELECT 'session',id,'a','w','c1','p2',encode(sha256(convert_to(data::text,'UTF8')),'hex'),'a','Synthetic historical Cockpit fixture only' FROM clara_sessions WHERE id='${sessionId}'`);
  await page.reload();await page.getByRole('alert').filter({hasText:'Ce fil est conservé en lecture seule'}).waitFor();assert.ok(await page.locator('form').filter({has:page.locator('input[placeholder]')}).last().locator('input').isDisabled());

 }finally{await browser.close();}
});
