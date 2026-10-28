import {revealAccountSettings,revealBusinessContext,revealMissionCreation,revealContextSelection} from './helpers/native-ui-disclosures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {X509Certificate,createHash,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const db=process.env.NATIVE_TEST_DATABASE,origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!/^native_browser_[a-f0-9]{32}$/.test(db??'')||!origin||!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Isolated fixture required');
const pg=q=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8',stdio:'pipe'}).trim();
const eventCount=s=>pg(`SELECT count(*) FROM clara_native_journal_scope s JOIN clara_journal_entries j ON j.id=s.entry_id WHERE s.session_id='${s}' AND j.entry->>'summary'='MISSION_CONTACT_ASSOCIATED'`);
const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
test('P1 browser: mission first/contact first, immutable old conversation, explicit fresh thread and durable idempotent association',async()=>{
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const ctx=await browser.newContext();await ctx.addCookies([{name:'clara_auth_session',value:'E'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await ctx.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());const page=await ctx.newPage();
  const cookie=async()=>(await ctx.cookies()).map(c=>c.name+'='+c.value).join(';');
  const call=async(path,body)=>fetch(origin+path,{method:body?'POST':'GET',headers:{cookie:await cookie(),...(body?{origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const select=async()=>{await page.goto(origin+'/clara');const panel=page.getByRole('region',{name:'Contexte canonique privé',exact:true});await revealContextSelection(page);await panel.locator('select').nth(0).selectOption('w');await panel.locator('select').nth(1).selectOption('c1');await panel.locator('select').nth(2).selectOption('p1');await Promise.all([page.waitForEvent('load'),panel.getByRole('button',{name:'Créer un nouveau fil',exact:true}).click()]);};
  const make=async title=>{await revealMissionCreation(page);await page.getByLabel('Titre de la mission',{exact:true}).fill(title);await page.getByLabel('Objectif de la mission',{exact:true}).fill('Explicit mission contact association');await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Créer la mission',exact:true}).click()]);return (await (await call('/api/native/runtime')).json()).session;};
  const attach=async()=>{await revealBusinessContext(page);await page.getByLabel('Contact / prospect',{exact:true}).selectOption('prospect-a');page.once('dialog',d=>d.accept());await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Sélectionner le contact',exact:true}).click()]);};
  await select();const first=await make('P1_MISSION_FIRST');assert.equal((await call('/api/native/runtime',{action:'associateMissionContact',missionId:first.mission.id,submissionId:'prospect-a',approve:false})).status,400);await attach();
  const active=(await (await call('/api/native/runtime')).json()).session;assert.equal(active.mission.id,first.mission.id);assert.equal(active.acquisitionSubmissionId,'prospect-a');assert.equal(eventCount((await (await call('/api/native/runtime')).json()).data.sessionId),'1');
  assert.equal((await call('/api/clara/chat',{operationId:randomUUID(),message:'P1_MISSION_FIRST_DIALOGUE'})).status,200);
  const firstState=(await (await call('/api/native/runtime')).json());assert.equal(firstState.session.mission.id,first.mission.id);
  for(const path of ['/','/missions','/conversations','/contacts','/journal']){await page.goto(origin+path);if(path==='/contacts')await page.locator('p').filter({hasText:/^PRIVATE_prospect-a$/}).waitFor();assert.equal(await page.locator('[data-native-authority="locked"]').count(),0);const text=await page.locator('body').innerText();assert.ok(!text.includes('PRIVATE_prospect-b'));if(path==='/contacts')assert.ok(text.includes('PRIVATE_prospect-a'));if(path==='/conversations')assert.ok(text.includes('P1_MISSION_FIRST_DIALOGUE'));if(path==='/journal')assert.ok(text.includes('MISSION_CONTACT_ASSOCIATED'));}
  await page.reload();assert.equal((await (await call('/api/native/runtime')).json()).session.mission.id,first.mission.id);
  // A second mission already has historical turns. Associate only the business
  // resource, never mutate its original conversation's contact/context.
  await select();const historical=await make('P1_HISTORICAL_MISSION');assert.equal((await call('/api/clara/chat',{operationId:randomUUID(),message:'P1_BEFORE_CONTACT'})).status,200);
  const before=(await (await call('/api/native/runtime')).json()),history=JSON.stringify(before.session.conversation),sid=before.data.sessionId;await page.reload();
  await revealBusinessContext(page);await page.getByLabel('Contact / prospect',{exact:true}).selectOption('prospect-a');
  page.once('dialog',d=>d.accept());let ack;const committed=new Promise(r=>{ack=r;});
  await page.route('**/api/native/runtime',async r=>{if(r.request().method()!=='POST'||r.request().postDataJSON()?.action!=='associateMissionContact')return r.continue();const q=r.request(),response=await fetch(q.url(),{method:'POST',headers:await q.allHeaders(),body:q.postData()});assert.equal(response.status,200,await response.clone().text());await response.json();await r.abort('failed');ack();});
  await page.getByRole('button',{name:'Sélectionner le contact',exact:true}).click();await committed;await page.unroute('**/api/native/runtime');await page.reload();
  await revealAccountSettings(page);await page.locator('[data-context-loading="false"]').waitFor();
  assert.equal(await page.locator('[data-native-business-context]').evaluate(e=>e.open),false);
  const warning=page.getByRole('status').filter({hasText:'Contact associé à la mission'});await warning.waitFor();
  if(process.env.P1_UI_EVIDENCE){mkdirSync(process.env.P1_UI_EVIDENCE,{recursive:true});await warning.screenshot({path:process.env.P1_UI_EVIDENCE+'/contact-requires-new-thread.png'});}
  const after=(await (await call('/api/native/runtime')).json());assert.equal(after.data.sessionId,sid);assert.equal(after.session.mission.id,historical.mission.id);assert.equal(after.session.mission.acquisitionSubmissionId,'prospect-a');assert.equal(after.session.acquisitionSubmissionId,undefined);assert.equal(JSON.stringify(after.session.conversation),history);assert.equal(eventCount(sid),'1');
  const replay=await call('/api/native/runtime',{action:'associateMissionContact',missionId:historical.mission.id,submissionId:'prospect-a',approve:true});assert.equal(replay.status,200);assert.equal((await replay.json()).requiresNewSession,true);assert.equal(eventCount(sid),'1');
  const denied=await call('/api/native/runtime',{action:'selectAcquisition',submissionId:'prospect-a'});assert.equal(denied.status,409);assert.equal((await denied.json()).code,'NATIVE_NEW_SESSION_REQUIRED');
  // Existing workflow, explicit new session, contact first, reopen SAME mission.
  await select();await revealBusinessContext(page);await page.getByLabel('Contact / prospect',{exact:true}).selectOption('prospect-a');await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Sélectionner le contact',exact:true}).click()]);await revealBusinessContext(page);await page.getByLabel('Mission autorisée',{exact:true}).selectOption(historical.mission.id);await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Reprendre cette mission',exact:true}).click()]);
  const fresh=(await (await call('/api/native/runtime')).json());assert.notEqual(fresh.data.sessionId,sid);assert.equal(fresh.session.mission.id,historical.mission.id);assert.equal(fresh.session.acquisitionSubmissionId,'prospect-a');assert.equal(fresh.session.conversation.length,0);assert.equal(pg(`SELECT count(*) FROM clara_native_conversation_messages WHERE session_id='${sid}'`),'2');
  writeFileSync('/tmp/native-p1-restart-'+db,JSON.stringify({scope:fresh.data,missionId:historical.mission.id,oldSessionId:sid,history}));
 }finally{await browser.close();}
});
