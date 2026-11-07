import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {X509Certificate,createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {revealContextSelection,closeContextSelection} from './helpers/native-ui-disclosures.mjs';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Isolated HTTPS/PostgreSQL fixture required');
const evidence=process.env.HEADER_LOGIN_EVIDENCE;
test('header cleanup: all pages × five locales × desktop/mobile; existing context switching, sign-in entry and revoked access',{timeout:240000},async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 let lastScope;
 const pages=['','clara','missions','conversations','contacts','documents','messagerie','agenda','journal','brain','automatisations','connexions','telephonie'],matrix=[];
 if(evidence)mkdirSync(evidence,{recursive:true});
 const labels=locale=>JSON.parse(readFileSync(`src/i18n/messages/${locale}/consolidated-ui.json`,'utf8'));
 async function contextFor(viewport){const context=await browser.newContext({viewport});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await context.route('**/api/connections/microsoft',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'MICROSOFT_WORKSPACE_AUTH_REQUIRED'})}));return context;}
 try{
  for(const [format,viewport]of Object.entries({desktop:{width:1440,height:1000},mobile:{width:390,height:844}})){
   const context=await contextFor(viewport),page=await context.newPage();
   for(const locale of ['fr','en','es','de','it']){
    await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);await page.goto(origin+'/');await page.locator('[data-google-sign-in-card]').waitFor();
    const card=page.locator('[data-google-sign-in-card]');await card.getByRole('heading',{name:labels(locale).signInWelcome,exact:true}).waitFor();
    assert.equal(await card.getByRole('link',{name:labels(locale).signInWithGoogle,exact:true}).getAttribute('href'),'/api/auth/google/start');
    assert.equal(await card.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
    assert.equal(await page.locator('#main-workspace .native-context').count(),0);
    assert.ok(await page.locator('#main-workspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    if(evidence)await page.screenshot({path:`${evidence}/login-${format}-${locale}-after.png`,fullPage:true});
   }
   // Same existing user, distinct disposable session E; no enrollment or identity changes.
   await context.addCookies([{name:'clara_auth_session',value:'E'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
   const make=async projectId=>{const r=await context.request.post(origin+'/api/native/runtime',{headers:{origin},data:{action:'createSession',workspaceId:'w',clientId:'c1',projectId}});assert.equal(r.status(),200);return (await r.json()).data;};
   const one=await make('p1'),two=await make('p2');lastScope=one;
   await page.goto(origin+'/missions');assert.equal(await page.locator('[data-context-loading]').count(),0);
   await revealContextSelection(page);const dialog=page.locator('[data-native-context-dialog]');
   await dialog.locator('[data-native-context-switch] select').nth(2).selectOption('p1');
   await page.getByLabel(labels('fr').nativeSessionId,{exact:true}).selectOption(one.sessionId);
   await Promise.all([page.waitForEvent('load'),dialog.getByRole('button',{name:labels('fr').nativeOpenSession,exact:true}).click()]);
   let actual=await (await context.request.get(origin+'/api/native/runtime')).json();assert.equal(actual.data.sessionId,one.sessionId);assert.equal(actual.data.projectId,'p1');
   await page.reload();actual=await (await context.request.get(origin+'/api/native/runtime')).json();assert.equal(actual.data.sessionId,one.sessionId);
   await revealContextSelection(page);await dialog.press('Escape');assert.equal(await dialog.evaluate(e=>e.open),false);
   await revealContextSelection(page);await page.mouse.click(2,2);assert.equal(await dialog.evaluate(e=>e.open),false);
   await revealContextSelection(page);await closeContextSelection(page);assert.equal(await page.locator('[data-open-native-context]').evaluate(e=>e===document.activeElement),true);
   for(const locale of ['fr','en','es','de','it']){
    await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);
    for(const path of pages){
     const response=await page.goto(origin+'/'+path);assert.equal(response.status(),200);
     assert.equal(await page.locator('[data-native-authority]').count(),0,`${locale} /${path}: authorized pages must not enter any recovery/sign-in state`);
     assert.equal(await page.locator('[data-context-loading], [data-cockpit-context]').count(),0,`No automatically mounted selector on /${path}`);
     assert.equal(await page.locator('#main-workspace .native-context').count(),0);
     assert.ok(await page.locator('#main-workspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${format} /${path}`);
     assert.equal(await page.locator('html').getAttribute('lang'),locale);
     if(evidence&&locale==='fr')await page.screenshot({path:`${evidence}/${path||'cockpit'}-${format}-after.png`,fullPage:true});
     matrix.push({page:'/'+path,format,locale,result:'PASS isolated native PostgreSQL'});
    }
   }
   await context.addCookies([{name:'NEXT_LOCALE',value:'fr',url:origin}]);await page.goto(origin+'/');await revealContextSelection(page);
   if(evidence)await page.screenshot({path:`${evidence}/context-${format}-after.png`});
   // Actual cross-project selector switch, then navigation back to Cockpit.
   await dialog.locator('[data-native-context-switch] select').nth(2).selectOption('p2');await page.getByLabel(labels('fr').nativeSessionId,{exact:true}).selectOption(two.sessionId);
   await Promise.all([page.waitForEvent('load'),dialog.getByRole('button',{name:labels('fr').nativeOpenSession,exact:true}).click()]);
   actual=await (await context.request.get(origin+'/api/native/runtime')).json();assert.equal(actual.data.sessionId,two.sessionId);assert.equal(actual.data.projectId,'p2');
   // Foreign user cannot open the same persisted thread. No ACL adjustments.
   const denied=await fetch(origin+'/api/native/runtime?'+new URLSearchParams(one),{headers:{cookie:'clara_auth_session='+'B'.repeat(43)}});assert.equal(denied.status,403);
   await context.close();
  }
  // Refusals remain locked; changing the entry screen grants no access.
  for(const token of ['', 'invalid','D'.repeat(43)]){
   const context=await contextFor({width:390,height:844});if(token)await context.addCookies([{name:'clara_auth_session',value:token,url:origin}]);const page=await context.newPage();await page.goto(origin+'/missions');await page.locator(`[data-native-authority=${token==='D'.repeat(43)?'scope':'signIn'}]`).waitFor();assert.ok([401,403].includes((await context.request.get(origin+'/api/native/runtime?'+new URLSearchParams(lastScope))).status()));await context.close();
  }
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
  if(evidence)writeFileSync(evidence+'/matrix.json',JSON.stringify({provider:'Google authentication not exercised against real Google; existing routes unchanged',matrix},null,2)+'\n');
 }finally{await browser.close();}
});
