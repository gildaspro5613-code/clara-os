import {revealMissionCreation,revealContextSelection} from './helpers/native-ui-disclosures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {X509Certificate,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||!['127.0.0.1','localhost'].includes(new URL(origin).hostname)||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Local isolated fixture only');
const statePath='/tmp/native-fixture-google-state-'+db;
test('documentary browser E2E: canonical selection → mission → pinned OAuth → explicit Google selection → project attestation → PDF/Core/Brain → Journal/Cockpit → fresh resume and revocation',async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const context=await browser.newContext();await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
  const page=await context.newPage();await page.goto(origin+'/clara');const selector=page.getByRole('region',{name:'Contexte canonique privé',exact:true});
  await revealContextSelection(page);await selector.locator('select').nth(0).selectOption('w');await selector.locator('select').nth(1).selectOption('c1');await selector.locator('select').nth(2).selectOption('p1');
  await Promise.all([page.waitForResponse(r=>r.url().includes('/api/native/runtime')&&r.request().method()==='POST'),selector.getByRole('button',{name:'Créer un nouveau fil'}).click()]);
  await revealMissionCreation(page);await page.getByRole('textbox',{name:'Titre de la mission',exact:true}).fill('LOT2_DOCUMENTARY_MISSION');await page.getByRole('textbox',{name:'Objectif de la mission',exact:true}).fill('Analyze the project document and preserve commercial continuity');
  await Promise.all([page.waitForResponse(r=>r.url().includes('/api/native/runtime')&&r.request().method()==='POST'),page.getByRole('button',{name:'Créer la mission',exact:true}).click()]);
  await revealMissionCreation(page);await page.getByRole('textbox',{name:'Titre de la mission',exact:true}).waitFor();
  const cookie=async()=> (await context.cookies()).map(c=>c.name+'='+c.value).join(';');
  const call=async(path,method='GET',body,customCookie)=>fetch(origin+path,{method,redirect:'manual',headers:{cookie:customCookie??await cookie(),origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body.action==='read'?{operationId:crypto.randomUUID(),...body}:body)}:{})});
  const begin=async()=>{const r=await page.evaluate(async()=>{const r=await fetch('/api/connections/google/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return {status:r.status,body:await r.json()};});assert.equal(r.status,200,JSON.stringify(r.body));return new URL(r.body.authorizationUrl);};
  let authorization=await begin();const callback=(account,url)=>'/api/connections/google/callback?'+new URLSearchParams({state:url.searchParams.get('state'),code:account+'.'+Buffer.from(url.searchParams.get('nonce')).toString('base64url')});
  const malformed=await call('/api/connections/google/callback?state=forged&code=synthetic');assert.equal(malformed.status,403);
  const mismatch=await call(callback('fixture-b',authorization));assert.equal(mismatch.status,403,await mismatch.clone().text());
  authorization=await begin();const callbackPath=callback('fixture-a',authorization);const connected=await call(callbackPath);assert.equal(connected.status,307,await connected.clone().text());assert.equal((await call(callbackPath)).status,403,'One-time callback cannot be replayed');
  const list=await (await call('/api/connections/google')).json();const connection=list.connections.find(c=>c.status==='ACTIVE');assert.ok(connection);assert.ok(!JSON.stringify(list).includes('encryptedPayload'));assert.ok(!JSON.stringify(list).includes('google-a'));
  assert.equal((await call('/api/connections/google','POST',{action:'select',connectionId:'foreign-google-b'})).status,403);
  await page.goto(origin+'/documents');const panel=page.getByRole('region',{name:'Documents de la mission',exact:true});await panel.getByRole('combobox',{name:'Connexion Google autorisée'}).selectOption(connection.id);
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/connections/google')&&r.request().method()==='POST'),panel.getByRole('button',{name:'Sélectionner la connexion'}).click()]);
  await page.locator('[data-document-authority-settings] summary').click();
  await page.getByRole('textbox',{name:'Identifiant du document Drive'}).fill('document-a');await page.getByRole('button',{name:'Examiner le document',exact:true}).click();await page.getByText('Authorized project PDF · Révision 1').waitFor();
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/documents')&&r.request().method()==='POST'&&r.request().postDataJSON().action==='bind'),page.getByRole('button',{name:'Attester pour ce projet',exact:true}).click()]);
  const article=page.locator('article').filter({has:page.getByText('Authorized project PDF',{exact:true})});await article.getByRole('button',{name:'Lire avec Clara',exact:true}).click();await page.locator('pre').getByText(/LOT2_AUTHORIZED_PDF/).waitFor();
  // Shared Google document, explicitly attested to this project, then a
  // project-specific delegated canonical user with their OWN Mission/Journal.
  assert.equal((await call('/api/documents','POST',{action:'bind',fileId:'document-shared',version:'1'})).status,200);
  assert.equal((await call('/api/documents','POST',{action:'read',fileId:'document-shared',locale:'fr'})).status,200);
  const newThread=async(token,clientId,projectId)=>{const r=await call('/api/native/runtime','POST',{action:'createSession',workspaceId:'w',clientId,projectId},'clara_auth_session='+token.repeat(43));assert.equal(r.status,200);const d=await r.json();return {cookie:'clara_auth_session='+token.repeat(43)+'; '+r.headers.get('set-cookie').split(';')[0],scope:d.data};};
  const b=await newThread('B','c1','p1');assert.equal((await call('/api/connections/google','POST',{action:'select',connectionId:connection.id},b.cookie)).status,403);
  assert.equal((await call('/api/connections/google','POST',{action:'delegate',connectionId:connection.id,userId:'b'})).status,200);
  assert.equal((await call('/api/connections/google','POST',{action:'select',connectionId:connection.id},b.cookie)).status,200);
  assert.equal((await call('/api/native/runtime','POST',{action:'createMission',title:'LOT2_B_SHARED',objective:'Use an explicitly shared document'},b.cookie)).status,200);
  assert.equal((await call('/api/documents','POST',{action:'read',fileId:'document-shared',locale:'fr'},b.cookie)).status,200);
  assert.equal((await call('/api/connections/google','POST',{action:'revokeDelegation',connectionId:connection.id,userId:'b'})).status,200);
  assert.equal((await call('/api/documents?action=references','GET',undefined,b.cookie)).status,403);
  for(const [clientId,projectId] of [['c1','p2'],['c2','p3']]){const foreign=await newThread('A',clientId,projectId);assert.equal((await call('/api/connections/google','POST',{action:'select',connectionId:connection.id},foreign.cookie)).status,200);assert.equal((await call('/api/native/runtime','POST',{action:'createMission',title:'LOT2_OTHER_PROJECT',objective:'Separate project'},foreign.cookie)).status,200);assert.equal((await call('/api/documents','POST',{action:'read',fileId:'document-a'},foreign.cookie)).status,403);assert.equal((await call('/api/documents','POST',{action:'bind',fileId:'document-a',version:'1'},foreign.cookie)).status,403);assert.equal((await call('/api/documents','POST',{action:'inspect',fileId:'document-a'},foreign.cookie)).status,403);}
  execFileSync(process.execPath,['--import','tsx','src/tests/helpers/native-google-expire-fixture.mts',db,connection.id],{stdio:['pipe','pipe','pipe']});
  const verified=await call('/api/native/documents/authorization?fileId=document-a');assert.equal(verified.status,200);assert.equal((await verified.json()).verification.readAllowed,true);
  const download=await call('/api/documents?action=download&fileId=document-a');assert.equal(download.status,200);assert.ok((await download.arrayBuffer()).byteLength>100);
  const persisted=await (await call('/api/documents?action=references')).json();assert.equal(persisted.references[0].available,true);assert.ok(persisted.references[0].analysis.answer);
  for(const path of ['/journal','/','/clara']){await page.goto(origin+path);assert.equal(await page.locator('[data-native-authority="locked"]').count(),0);if(path==='/journal')assert.ok((await page.locator('body').innerText()).includes('DOCUMENT_RECEIVED'));else await page.locator('[data-native-document="document-a"]').waitFor();}
  await page.reload();await page.locator('[data-native-document="document-a"]').waitFor();
  const current=await (await call('/api/native/runtime')).json(),fresh=await newThread('A','c1','p1');
  assert.equal((await call('/api/native/runtime','POST',{action:'selectMission',missionId:current.session.mission.id},fresh.cookie)).status,200);
  assert.equal((await call('/api/connections/google','POST',{action:'select',connectionId:connection.id},fresh.cookie)).status,200);
  const restored=await (await call('/api/documents?action=references','GET',undefined,fresh.cookie)).json();assert.equal(restored.references.filter(r=>r.available).length,2);
  // Same verified canonical user, fresh independent auth session; no email association.
  await context.addCookies([{name:'clara_auth_session',value:'E'.repeat(43),url:origin}]);await page.reload();await page.locator('[data-native-document="document-a"]').waitFor();
  assert.equal((await call('/api/documents','POST',{action:'read',fileId:'document-b'})).status,403);
  assert.equal((await call('/api/documents','POST',{action:'read',fileId:'document-p3'})).status,403);
  assert.equal((await call('/api/documents','POST',{action:'read',fileId:'historical-unbound'})).status,403);
  assert.equal((await call('/api/documents','GET',undefined,'clara_auth_session=invalid')).status,401);
  assert.equal((await call('/api/documents','GET',undefined,'')).status,401);
  const activeCookie=await cookie();assert.equal((await call('/api/documents','GET',undefined,activeCookie.replace('E'.repeat(43),'D'.repeat(43)))).status,403);
  const state=JSON.parse(readFileSync(statePath,'utf8'));state.denied.push('document-a');writeFileSync(statePath,JSON.stringify(state));
  const denied=await (await call('/api/documents?action=references')).json();const deniedA=denied.references.find(r=>r.fileId==='document-a');assert.equal(deniedA.available,false);assert.ok(!('analysis' in deniedA));assert.ok(!JSON.stringify(deniedA).includes('Authorized project PDF'));
  await page.reload();await page.getByText('document-a · Ce service externe reste indisponible dans le contexte natif tant que ses autorisations ne sont pas certifiées.').waitFor();assert.ok(!(await page.locator('[data-native-document="document-a"]').innerText()).includes('Isolated Clara response'));
  state.denied=[];state.versions['document-a']='2';writeFileSync(statePath,JSON.stringify(state));assert.equal((await call('/api/documents','POST',{action:'read',fileId:'document-a'})).status,409);
  state.versions['document-a']='1';state.principal='google-b';writeFileSync(statePath,JSON.stringify(state));const changed=await call('/api/documents','POST',{action:'read',fileId:'document-a'});assert.equal(changed.status,403,await changed.clone().text());state.principal=null;writeFileSync(statePath,JSON.stringify(state));
  const prompts=readFileSync('/tmp/native-fixture-google-prompts-'+db,'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));assert.ok(prompts.some(p=>p.phase==='composer'&&p.ownDocument));assert.ok(prompts.some(p=>p.phase==='refresh'));assert.ok(prompts.every(p=>p.foreignAbsent));assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
  assert.equal((await call('/api/connections/google','POST',{action:'revoke',connectionId:connection.id})).status,200);assert.equal((await call('/api/documents')).status,403);
  await context.close();
 }finally{await browser.close();}
});
