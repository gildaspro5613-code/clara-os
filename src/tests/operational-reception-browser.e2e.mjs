import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!origin||!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw new Error('Isolated localhost server required');
const privateMarkers=['PRIVATE_LEGACY_HISTORY','PRIVATE_FULL_EMAIL_BODY','PRIVATE_EMAIL_SNIPPET','PRIVATE_DRAFT_BODY','PRIVATE_REQUEST_SOURCE','Source mission 0','Synthetic draft subject','sender@example.invalid'];
// The populated fixture deliberately contains global/private data. These are
// actual server requests: no API fulfill/mocks can bypass the production fence.
test('native server pages: no private HTML/RSC leakage across six pages and five locales',async()=>{
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox']});
 try{for(const locale of ['fr','en','es','de','it']){
  const ui=JSON.parse(await readFile(new URL(`../i18n/messages/${locale}/consolidated-ui.json`,import.meta.url)));
  const context=await browser.newContext();await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(origin).origin?route.continue():route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/MISSING_MESSAGE|INVALID_MESSAGE|IntlError/.test(m.text()))errors.push(m.text());});
  for(const path of ['/','/clara','/missions','/journal','/brain','/conversations']){
   const response=await page.goto(origin+path);assert.equal(response.status(),200);
   await page.getByRole('heading',{name:ui.nativeAccessLocked,exact:true}).waitFor();
   assert.equal(await page.locator('[data-native-authority="locked"]').count(),1);
   const html=await response.text(),body=await page.locator('body').innerText();
   for(const marker of privateMarkers){assert.ok(!html.includes(marker),`${locale} ${path} HTML/RSC ${marker}`);assert.ok(!body.includes(marker),`${locale} ${path} body ${marker}`);}
   assert.equal(await page.locator('html').getAttribute('lang'),locale);
  }
  assert.deepEqual(errors,[],locale);await context.close();
 }}finally{await browser.close();}
});
test('real native HTTP rejects missing/invalid cookies and forged ownership without provider calls',async()=>{
 let checked=0;
 for(const cookie of ['', 'clara_auth_session=invalid'])for(const [method,path]of [
  ['GET','/api/clara/session'],['GET','/api/documents'],['GET','/api/contacts'],['GET','/api/calendar'],
  ['GET','/api/clara/acquisition/decisions'],['POST','/api/clara/chat'],['POST','/api/missions/execute'],
  ['POST','/api/missions/resume'],['POST','/api/workspace/install'],['PATCH','/api/clara/acquisition/commercial-draft']
 ]){
  const response=await fetch(origin+path,{method,headers:{cookie,'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify({userId:'victim',workspaceId:'foreign',clientId:'foreign',projectId:'foreign',missionId:'mission-0'})})});
  assert.equal(response.status,401,`${method} ${path}`);assert.equal(response.headers.get('Cache-Control'),'no-store');
  const body=await response.text();for(const marker of privateMarkers)assert.ok(!body.includes(marker));assert.ok(!body.includes('mission-0'));checked++;
 }
 // A well-formed but unknown opaque cookie is not an authenticated session.
 const unknown=await fetch(origin+'/api/clara/session?workspaceId=foreign&clientId=c&projectId=p&sessionId=native:victim',{headers:{cookie:'clara_auth_session='+'C'.repeat(43)}});
 assert.equal(unknown.status,403);assert.deepEqual(await unknown.json(),{success:false,code:'NATIVE_SCOPE_DENIED'});
 console.info(`Checked ${checked} unauthenticated HTTP refusals and one unknown session.`);
});
