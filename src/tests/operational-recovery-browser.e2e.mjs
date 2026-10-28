import {revealMissionCreation,revealContextSelection} from './helpers/native-ui-disclosures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {X509Certificate,createHash,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!origin||!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Local isolated server required');
test('browser: consultation history without mission, exact Drive diagnostic, explicit mission and reload',async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const context=await browser.newContext();
  if(process.env.RECOVERY_BROWSER_RESUME==='1'){
   await context.addCookies(JSON.parse(readFileSync('/tmp/os-recovery-browser-cookies.json','utf8')));
   const page=await context.newPage();await page.goto(origin+'/conversations');await page.getByText('Quelle est ma mission active ?', {exact:true}).waitFor();
   const session=await(await context.request.get(origin+'/api/clara/session')).json();assert.equal(session.mission,null);
   console.info('PASS: consultation history and missionless identity survive application restart');return;
  }
  await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(origin).origin?route.continue():route.abort());
  const page=await context.newPage();await page.goto(origin+'/clara');
  const panel=page.getByRole('region',{name:'Contexte canonique privé',exact:true});
  await revealContextSelection(page);await panel.locator('select').nth(0).selectOption('w');await panel.locator('select').nth(1).selectOption('c1');await panel.locator('select').nth(2).selectOption('p1');
  await Promise.all([page.waitForEvent('load'),panel.getByRole('button',{name:'Créer un nouveau fil',exact:true}).click()]);await revealMissionCreation(page);await page.getByLabel('Titre de la mission',{exact:true}).waitFor();
  const call=async(message)=>page.evaluate(async p=>{const r=await fetch('/api/clara/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});return {status:r.status,body:await r.json()};},{message,operationId:randomUUID()});
  const first=await call('Quelle est ma mission active ?');assert.equal(first.status,200);const second=await call('Quel est mon contexte ?');assert.equal(second.status,200);
  await page.reload();const session=await(await context.request.get(origin+'/api/clara/session')).json();assert.equal(session.mission,null);
  await page.goto(origin+'/conversations');await page.getByText('Quelle est ma mission active ?', {exact:true}).waitFor();
  writeFileSync('/tmp/os-recovery-browser-cookies.json',JSON.stringify(await context.cookies()),{mode:0o600});
  await page.goto(origin+'/documents');await page.getByText(/\[NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED\]/).waitFor();
  const create=await context.request.post(origin+'/api/native/runtime',{headers:{origin},data:{action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'}});assert.equal(create.status(),200);
  await page.goto(origin+'/clara');await revealMissionCreation(page);await page.getByLabel('Titre de la mission',{exact:true}).fill('Recovery synthetic mission');await page.getByLabel('Objectif de la mission',{exact:true}).fill('No provider operation');await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Créer la mission',exact:true}).click()]);await page.locator('#main-workspace').getByText('Recovery synthetic mission',{exact:true}).first().waitFor();
  const before=await(await context.request.get(origin+'/api/clara/session')).json();assert.ok(before.mission.id);await call('Quel est le statut de cette mission ?');
  const after=await(await context.request.get(origin+'/api/clara/session')).json();assert.deepEqual(after.mission,before.mission);
  await page.reload();await page.getByText('Recovery synthetic mission',{exact:true}).first().waitFor();
  console.info('PASS: two consultations, durable history, no mission mutation, explicit creation, reload, safe Drive diagnostic');
 }finally{await browser.close();}
});
