import {revealBusinessContext,revealMissionCreation,revealContextSelection} from './helpers/native-ui-disclosures.mjs';
import {X509Certificate,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!origin||!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!/^native_browser_[a-f0-9]{32}$/.test(process.env.NATIVE_TEST_DATABASE??''))throw Error('Exact isolated native fixture required');
const pg=sql=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',process.env.NATIVE_TEST_DATABASE,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
test('commercial browser E2E: authenticated canonical selection → contact → mission → dialogue → journal → draft → cockpit → reload and fresh authenticated session',async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const context=await browser.newContext();await context.addCookies([{name:'clara_auth_session',value:'C'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(origin).origin?route.continue():route.abort());
  const page=await context.newPage();await page.goto(origin+'/clara');
  const selector=page.getByRole('region',{name:'Contexte canonique privé',exact:true});
  await revealContextSelection(page);await selector.locator('select').nth(0).selectOption('w');await selector.locator('select').nth(1).selectOption('c1');await selector.locator('select').nth(2).selectOption('p1');
  await selector.getByRole('button',{name:'Créer un nouveau fil',exact:true}).click();await revealBusinessContext(page);await page.getByLabel('Contact / prospect',{exact:true}).selectOption('prospect-a');
  await revealBusinessContext(page);assert.equal(await page.getByLabel('Contact / prospect',{exact:true}).locator('option').count(),2);
  await Promise.all([page.waitForEvent('framenavigated'),page.getByRole('button',{name:'Sélectionner le contact',exact:true}).click()]);await revealBusinessContext(page);await page.getByLabel('Contact / prospect',{exact:true}).waitFor();
  await revealMissionCreation(page);await page.getByLabel('Titre de la mission',{exact:true}).fill('LOT1_MISSION_A');await page.getByLabel('Objectif de la mission',{exact:true}).fill('Préparer une communication sans envoi');
  await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Créer la mission',exact:true}).click()]);await page.locator('[data-clara-mission-context] > summary').click();await page.locator('article').getByText('LOT1_MISSION_A',{exact:true}).waitFor();
  const cookies=await context.cookies(),cookie=cookies.map(c=>c.name+'='+c.value).join(';');const selected=JSON.parse(decodeURIComponent(cookies.find(c=>c.name==='clara_native_selection').value));
  const call=(path,method='GET',body,auth=cookie)=>fetch(origin+path,{method,headers:{cookie:auth,...(method!=='GET'?{origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const contacts=await (await call('/api/contacts')).json();assert.deepEqual(contacts.contacts.map(c=>c.id),['prospect-a']);assert.equal(contacts.selectedSubmissionId,'prospect-a');
  const missionBeforeChat=(await (await call('/api/clara/session?'+new URLSearchParams(selected))).json()).mission;
  const consultation='LOT1_DIALOGUE — quel est le suivi du contact sélectionné ?';
  const chat=await call('/api/clara/chat','POST',{operationId:crypto.randomUUID(),message:consultation});assert.equal(chat.status,200,await chat.clone().text());
  const missionAfterChat=(await (await call('/api/clara/session?'+new URLSearchParams(selected))).json()).mission;
  assert.deepEqual(missionAfterChat,missionBeforeChat,'Consultation must preserve the selected commercial mission, including its title and tasks.');
  await page.goto(origin+'/journal');assert.ok((await page.locator('body').innerText()).includes('PRIVATE_prospect-a'));
  await page.goto(origin+'/clara');await revealBusinessContext(page);const [preparedResponse]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/native/runtime'&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='prepareCommercialDraft'),page.getByRole('button',{name:'Communication préparée par Clara',exact:true}).click()]);assert.equal(preparedResponse.status(),200);
  await page.locator('#commercial-draft').getByText('prospect-a@example.invalid',{exact:false}).waitFor();
  const draft=JSON.parse(pg("SELECT commercial_draft::text FROM clara_acquisition_records WHERE submission_id='prospect-a'"));assert.equal(draft.revision,1);assert.equal(draft.delivery.allowed,false);
  const patch=await call('/api/clara/acquisition/commercial-draft','PATCH',{submissionId:'prospect-a',revision:1,subject:'LOT1_DURABLE_SUBJECT',body:'LOT1_DURABLE_BODY'});assert.equal(patch.status,200,await patch.clone().text());
  const stale=await call('/api/clara/acquisition/commercial-draft','PATCH',{submissionId:'prospect-a',revision:1,subject:'STALE',body:'MUST_NOT_PERSIST'});assert.equal(stale.status,409);
  await page.goto(origin+'/');const cockpit=await page.locator('body').innerText();assert.ok(cockpit.includes('prospect-a@example.invalid'));assert.ok(cockpit.includes('LOT1_DURABLE_SUBJECT'));assert.ok(cockpit.includes('LOT1_MISSION_A'),'Cockpit must retain the explicitly created mission title, not rename it after a consultation.');
  // Compact Cockpit deliberately links to history instead of rendering message bodies.
  await page.getByRole('link',{name:'Ouvrir l’historique →',exact:true}).click();
  await page.getByText(consultation,{exact:true}).waitFor();
  await page.goto(origin+'/clara');await page.reload();const restoredDraft=page.locator('#commercial-draft');assert.equal(await restoredDraft.evaluate(e=>e.open),false);await restoredDraft.locator(':scope > summary').click();assert.ok((await page.locator('body').innerText()).includes('LOT1_DURABLE_BODY'));assert.ok((await page.locator('body').innerText()).includes('LOT1_DIALOGUE'));
  const send=await call('/api/clara/chat','POST',{operationId:crypto.randomUUID(),message:'Oui, envoie le mail'});assert.equal(send.status,403);assert.equal((await send.json()).code,'NATIVE_COMMERCIAL_SEND_DISABLED');
  for(const id of ['prospect-b','prospect-p2','prospect-p3','unbound-history']){const denied=await call('/api/native/runtime','POST',{action:'selectAcquisition',submissionId:id});assert.equal(denied.status,403);}
  const create=async(token,c,p)=>{const r=await call('/api/native/runtime','POST',{action:'createSession',workspaceId:'w',clientId:c,projectId:p},'clara_auth_session='+token.repeat(43));assert.equal(r.status,200);return 'clara_auth_session='+token.repeat(43)+'; '+r.headers.get('set-cookie').split(';')[0];};
  for(const [token,c,p,wanted]of [['B','c1','p1','prospect-b'],['E','c1','p2','prospect-p2'],['E','c2','p3','prospect-p3']]){const otherCookie=await create(token,c,p);const rows=await (await call('/api/contacts','GET',undefined,otherCookie)).json();assert.deepEqual(rows.contacts.map(c=>c.id),[wanted]);assert.equal((await call('/api/native/runtime','POST',{action:'selectAcquisition',submissionId:'prospect-a'},otherCookie)).status,403);}
  assert.equal((await call('/api/contacts','GET',undefined,cookie.replace('C'.repeat(43),'D'.repeat(43)))).status,403);
  // Real canonical logout revokes the bearer in PostgreSQL. Provider sign-in is
  // represented by another independently seeded verified-user session, never an email guess.
  assert.equal((await call('/api/auth/session/logout','POST',{})).status,200);
  assert.equal((await call('/api/contacts')).status,403);
  await context.addCookies([{name:'clara_auth_session',value:'E'.repeat(43),url:origin}]);await page.goto(origin+'/clara');assert.ok((await page.locator('body').innerText()).includes('LOT1_DURABLE_BODY'));assert.ok((await page.locator('body').innerText()).includes('LOT1_DIALOGUE'));
  const newCookie=(await context.cookies()).map(c=>c.name+'='+c.value).join(';');
  pg("UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE user_id='a' AND project_id='p1'");assert.equal((await call('/api/contacts','GET',undefined,newCookie)).status,403);pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE user_id='a' AND project_id='p1'");
  assert.equal(pg("SELECT COUNT(*) FROM clara_native_resource_authority WHERE resource_id='w/unbound-history'").trim(),'0');
  assert.equal(JSON.parse(pg("SELECT commercial_draft::text FROM clara_acquisition_records WHERE submission_id='prospect-a'")).revision,2);
  const promptProofs=readFileSync('/tmp/native-fixture-commercial-prompt-'+process.env.NATIVE_TEST_DATABASE,'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));assert.ok(promptProofs.length>0);assert.ok(promptProofs.every(p=>p.foreignContactAbsent));const composerProofs=promptProofs.filter(p=>p.phase==='composer');assert.ok(composerProofs.length>0);assert.ok(composerProofs.every(p=>p.ownContactPresent));
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+process.env.NATIVE_TEST_DATABASE,'utf8'),'');
  assert.equal((await call('/api/clara/session?'+new URLSearchParams(selected),'GET',undefined,newCookie)).status,200);
  await context.close();
 }finally{await browser.close();}
});
