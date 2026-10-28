import {assertHeroFlow} from './helpers/historical-hero-layout.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {X509Certificate,createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {revealAccountSettings,revealBusinessContext,revealContextSelection,revealMissionCreation} from './helpers/native-ui-disclosures.mjs';

const origin=process.env.DOCUMENTS_E2E_ORIGIN;
const db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Disposable local fixture required');
const out=process.env.INTERFACE_EVIDENCE??'/tmp/os-ui-after';
const dictionary=locale=>JSON.parse(readFileSync(`src/i18n/messages/${locale}/consolidated-ui.json`,'utf8'));
const pages=['','clara','missions','conversations','contacts','documents','messagerie','agenda','brain','journal','automatisations','connexions','telephonie'];

test('interface receipt: explicit business flow, responsive navigation, five languages, honest provider states and persistence',async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 mkdirSync(out,{recursive:true});const matrix=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
  await context.route('**/*',r=>{const h=r.request().headers();return new URL(r.request().url()).origin===new URL(origin).origin&&!h['next-router-prefetch']?r.continue():r.abort();});
  // Microsoft's adapter is outside this native fixture. Render refusal, not a fake success.
  await context.route('**/api/connections/microsoft',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'MICROSOFT_WORKSPACE_AUTH_REQUIRED'})}));
  const page=await context.newPage();
  await page.goto(origin+'/clara');await revealContextSelection(page);
  const scope=page.getByRole('region',{name:'Contexte canonique privé',exact:true});
  await scope.locator('select').nth(0).selectOption('w');await scope.locator('select').nth(1).selectOption('c1');await scope.locator('select').nth(2).selectOption('p1');
  await Promise.all([page.waitForEvent('load'),scope.getByRole('button',{name:'Créer un nouveau fil',exact:true}).click()]);
  await revealMissionCreation(page);await page.getByLabel('Titre de la mission',{exact:true}).fill('MISSION_INTERFACE_SYNTHETIQUE');
  await page.getByLabel('Objectif de la mission',{exact:true}).fill('Vérifier les interfaces sans fournisseur réel');
  await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Créer la mission',exact:true}).click()]);
  await page.locator('[data-context-loading="false"]').waitFor({state:'attached'});
  assert.equal(await page.locator('[data-native-context-switch]').evaluate(e=>e.open),false);
  assert.equal(await page.locator('[data-native-mission-create]').evaluate(e=>e.open),false);
  await revealBusinessContext(page);await page.getByLabel('Contact / prospect',{exact:true}).selectOption('prospect-a');page.once('dialog',d=>d.accept());
  await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Sélectionner le contact',exact:true}).click()]);
  await page.locator('[data-context-loading="false"]').waitFor({state:'attached'});
  const current=async()=>{const r=await context.request.get(origin+'/api/clara/session');assert.equal(r.status(),200);return r.json();};
  const before=await current();assert.equal(before.mission.title,'MISSION_INTERFACE_SYNTHETIQUE');
  const message='Question informative avec retour à la ligne\nConserver la source et le contexte autorisé.';
  const chat=page.getByRole('log');const input=page.locator('textarea').first();
  await input.fill(message.split('\n')[0]);await input.press('Shift+Enter');await input.pressSequentially(message.split('\n')[1]);
  assert.equal(await input.inputValue(),message);
  const reply=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'&&r.request().method()==='POST');
  await input.press('Enter');assert.equal((await reply).status(),200);
  await chat.getByText(message,{exact:true}).waitFor();
  assert.equal(await chat.getByText(message,{exact:true}).evaluate(e=>getComputedStyle(e).whiteSpace),'pre-wrap');
  await page.reload();await page.getByRole('log').getByText(message,{exact:true}).waitFor();
  assert.deepEqual((await current()).mission,before.mission);
  await page.goto(origin+'/missions');await page.getByRole('link',{name:dictionary('fr').uiNewMission,exact:true}).click();
  assert.equal(await page.locator('[data-native-context-switch]').evaluate(e=>e.open),true);await page.getByRole('button',{name:'Créer un nouveau fil',exact:true}).waitFor();assert.equal((await current()).mission.id,before.mission.id);
  await page.goto(origin+'/missions?mission=native:foreign-reference');await page.getByRole('alert').getByText(dictionary('fr').uiMissionUnavailable,{exact:true}).waitFor();assert.equal((await current()).mission.id,before.mission.id);
  await page.goto(origin+'/contacts');const contacts=await(await context.request.get(origin+'/api/contacts')).json();
  const contact=contacts.contacts.find(c=>c.id==='prospect-a');assert.ok(contact);await page.locator('[data-contact-id]').filter({hasText:contact.name}).first().waitFor();await page.locator('input[placeholder]').fill(contact.email);await page.getByRole('button',{name:'Rechercher',exact:true}).click();await page.locator('[data-contact-id]').filter({hasText:contact.name}).first().waitFor();
  await page.goto(origin+'/conversations');await page.getByText(message,{exact:true}).waitFor();
  await page.goto(origin+'/journal');await page.locator('article').filter({hasText:'MISSION_INTERFACE_SYNTHETIQUE'}).first().waitFor();
  // A general conversation remains independent of a mission and can be resumed
  // through the existing canonical list, without copying either history.
  const originalScope=(await(await context.request.get(origin+'/api/native/runtime')).json()).data;
  await page.goto(origin+'/clara');await revealContextSelection(page);
  await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Créer un nouveau fil',exact:true}).click()]);
  const generalMessage='How should we organise our day?';
  await page.locator('textarea').first().fill(generalMessage);
  const generalReply=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'&&r.request().method()==='POST');
  await page.locator('textarea').first().press('Enter');assert.equal((await generalReply).status(),200);
  await page.getByRole('log').getByText(generalMessage,{exact:true}).waitFor();assert.equal((await current()).mission,null);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('Langue',{exact:true}).selectOption('en')]);
  await page.getByRole('log').getByText(generalMessage,{exact:true}).waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await Promise.all([page.waitForEvent('load'),page.getByLabel('Language',{exact:true}).selectOption('fr')]);
  await page.goto(origin+'/');
  await page.getByRole('log').getByText(generalMessage,{exact:true}).waitFor();
  const [selectionResponse]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/native/runtime'&&r.request().method()==='POST'),page.locator('[data-conversation-id="'+originalScope.sessionId+'"]').click()]);
  assert.equal(selectionResponse.status(),200);
  await page.getByText(message,{exact:true}).waitFor();assert.equal(await page.getByText(generalMessage,{exact:true}).count(),0);
  assert.equal((await current()).mission.id,before.mission.id);


  // Every page is rendered at each viewport on the same persisted native context.
  for(const [device,width,height] of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844]]){
   await page.setViewportSize({width,height});
   for(const path of pages){
    const response=await page.goto(origin+'/'+path);assert.equal(response.status(),200,device+' '+path);
    await page.locator('[data-context-loading="false"]').waitFor({state:'attached'});
    assert.equal(await page.locator('[data-native-authority="locked"]').count(),0,path);
    assert.equal(await page.locator('#clara-navigation nav a[aria-current="page"]').getAttribute('href'),'/'+path);
    assert.ok(await page.locator('#main-workspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1),device+' '+path+' overflows');
    if(path==='')await assertHeroFlow(page);
    if(path==='clara'||path==='')await page.getByRole('log').getByText(message,{exact:true}).waitFor();
    if(path==='documents'){
     assert.equal(await page.locator('[data-document-authority-settings]').evaluate(e=>e.open),false);
     const search=await page.locator('#document-search').boundingBox(),admin=await page.locator('#native-google-document-authority').boundingBox();assert.ok(search.y<admin.y);
    }
    if(path==='automatisations'){const configure=page.getByRole('button',{name:'Modifier',exact:true});await configure.waitFor({state:'attached'});assert.equal(await configure.isDisabled(),true);}
    await page.screenshot({path:`${out}/${path||'cockpit'}-${device}.png`});
    matrix.push({page:'/'+path,locale:'fr',device,status:'PASS',proof:'real Next page/native PostgreSQL context; provider availability not certified'});
   }
   await page.locator('#native-account-menu > summary').click();
   await page.getByRole('region',{name:'Contexte canonique privé',exact:true}).waitFor();
   const accountBounds=await page.locator('[data-account-settings]').boundingBox();assert.ok(accountBounds.x>=0&&accountBounds.x+accountBounds.width<=width+1);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#native-account-menu').evaluate(e=>e.open),false);
   console.info('UI_VIEWPORT_PASS',device);
   if(device!=='desktop'){
    const menu=page.getByRole('button',{name:'Ouvrir le menu',exact:true});await menu.click();
    await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.equal(await menu.evaluate(e=>e===document.activeElement),true);
    await menu.click();await page.locator('#clara-navigation nav').getByRole('link',{name:'Missions',exact:true}).click();await page.waitForURL(origin+'/missions');assert.equal(await menu.getAttribute('aria-expanded'),'false');
   }
   await page.goto(origin+'/clara');await page.getByRole('log').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/conversation-${device}.png`});
  }
  await page.setViewportSize({width:1440,height:1000});
  for(const locale of ['fr','en','es','de','it']){
   await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);
   for(const path of pages){
    const response=await page.goto(origin+'/'+path);assert.equal(response.status(),200,locale+' '+path);await page.locator('[data-context-loading="false"]').waitFor({state:'attached'});
    assert.equal(await page.locator('html').getAttribute('lang'),locale);
    assert.equal(await page.locator('#native-account-menu').evaluate(e=>e.open),false);
    assert.equal(await page.locator('#main-workspace .native-context').count(),0);
    assert.ok(!(await page.locator('body').innerText()).includes('MISSING_MESSAGE'));
    matrix.push({page:'/'+path,locale,device:'desktop',status:'PASS',proof:'server render, translated shared controls, source data preserved'});
   }
   await page.goto(origin+'/connexions?microsoft=not_configured');await page.getByText(dictionary(locale).uiMicrosoftSetupMissing,{exact:true}).waitFor();
   console.info('UI_LOCALE_PASS',locale);
   await page.goto(origin+'/clara');await page.getByRole('log').getByText(message,{exact:true}).waitFor();
   // Explicit status fixtures only: no real account is created or selected.
   await context.route('**/api/native/mail',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,connections:[]})}));
   await page.goto(origin+'/messagerie');await page.getByRole('status').filter({hasText:dictionary(locale).uiMailEmpty}).waitFor();await page.screenshot({path:`${out}/mail-empty-${locale}.png`});await context.unroute('**/api/native/mail');
  }
  await context.addCookies([{name:'NEXT_LOCALE',value:'fr',url:origin}]);
  await context.route('**/api/native/mail',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,code:'PRIVATE_SENTINEL',message:'PRIVATE_SENTINEL'})}));
  await page.goto(origin+'/messagerie');await page.getByRole('alert').filter({hasText:dictionary('fr').mailUnavailable}).waitFor();assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_SENTINEL'));await page.screenshot({path:out+'/mail-error.png'});await context.unroute('**/api/native/mail');
  await page.goto(origin+'/documents');await page.getByText(/\[NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED\]/).waitFor();
  await page.getByRole('link',{name:dictionary('fr').uiDocumentSearch,exact:true}).click();await page.waitForURL(origin+'/documents#document-search');
  const logo=await context.request.get(origin+'/brand/clara-os-symbol.svg'),icon=await context.request.get(origin+'/icon.svg');assert.equal(await logo.text(),readFileSync('public/brand/clara-os-symbol.svg','utf8'));assert.equal(await icon.text(),await logo.text());
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'','No global loader or unscoped fallback');
  // Revoke the independent pre-existing E session, leaving A available to the
  // following Google-hub CI recipe that shares this disposable fixture.
  await context.addCookies([{name:'clara_auth_session',value:'E'.repeat(43),url:origin}]);await page.reload();
  await revealAccountSettings(page);page.once('dialog',d=>d.accept());
  const [logout]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/session/logout'),page.getByRole('button',{name:'Déconnexion',exact:true}).click()]);assert.equal(logout.status(),200);
  await page.locator('[data-native-authority="locked"]').waitFor();
  assert.equal((await context.request.get(origin+'/api/native/runtime')).status(),401);
  const savedSelection=(await context.cookies()).find(c=>c.name==='clara_native_selection');assert.ok(savedSelection);
  assert.equal((await context.request.get(origin+'/api/native/runtime',{headers:{cookie:'clara_auth_session='+'E'.repeat(43)+'; '+savedSelection.name+'='+savedSelection.value}})).status(),401);
  const resumed=await context.request.get(origin+'/api/native/runtime',{headers:{cookie:'clara_auth_session='+'A'.repeat(43)+'; '+savedSelection.name+'='+savedSelection.value}});assert.equal(resumed.status(),200);
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
  const resumedState=await resumed.json();assert.equal(resumedState.session.mission.id,before.mission.id);assert.ok(resumedState.session.conversation.some(m=>m.content===message));

  writeFileSync(out+'/matrix.json',JSON.stringify({status:'PASS',providerCertified:false,matrix,business:{explicitMission:true,contact:true,multilineConversation:true,reload:true,journal:true},mailStates:'HTTP fixtures for empty/refused presentation; actual approval flow received separately'},null,2)+'\n');
 }finally{await browser.close();}
});
