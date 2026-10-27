import test from 'node:test';
import assert from 'node:assert/strict';
import {X509Certificate,createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const origin=process.env.DOCUMENTS_E2E_ORIGIN;
if(!origin||!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Local isolated server required');
const out=process.env.DELIVERY_CAPTURE_DIR??'/tmp/os-delivery-captures';
test('delivery UI: official logo, business navigation, private advanced controls, filtered diagnosis and mobile',async()=>{
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 mkdirSync(out,{recursive:true});const results=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
  // This UI receipt does not certify Microsoft's separate authenticated workspace adapter.
  // Its auth SQL is deliberately outside the native fixture allowlist: render a refused
  // status, never broaden that allowlist or contaminate the security receipt's marker.
  await context.route('**/api/connections/microsoft',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'MICROSOFT_WORKSPACE_AUTH_REQUIRED'})}));
  const page=await context.newPage();
  const call=await context.request.post(origin+'/api/native/runtime',{headers:{origin},data:{action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'}});assert.equal(call.status(),200);
  const logo=await context.request.get(origin+'/brand/clara-os-symbol.svg');assert.equal(logo.status(),200);assert.equal(await logo.text(),readFileSync('public/brand/clara-os-symbol.svg','utf8'));
  const tabIcon=await context.request.get(origin+'/icon.svg');assert.equal(tabIcon.status(),200);assert.equal(await tabIcon.text(),await logo.text());
  for(const path of ['clara','missions','conversations','contacts','documents','messagerie','agenda','journal','brain','automatisations','connexions','']){
   const response=await page.goto(origin+'/'+path);assert.equal(response.status(),200,path);
   await page.locator('link[rel="icon"][href^="/icon.svg"]').waitFor({state:'attached'});
   assert.equal(await page.locator('link[rel="icon"][href^="/icon.svg"]').count(),1);
   assert.equal(await page.locator('link[rel="icon"][href^="/favicon.ico"]').count(),0);
   await page.getByRole('region',{name:'Contexte canonique privé',exact:true}).waitFor();
   await page.getByText('Identifiants du contexte sélectionné',{exact:true}).waitFor();
   await page.getByText(/Contexte canonique privé · w \/ Client c1 \/ Project p1/).waitFor();
   if(path==='documents')await page.getByText(/\[NATIVE_GOOGLE_EXPLICIT_SELECTION_REQUIRED\]/).waitFor();
   assert.equal(await page.locator('[data-native-authority="locked"]').count(),0,path);
   await page.screenshot({path:out+'/'+(path||'cockpit')+'-desktop.png',fullPage:true});
   results.push({path:'/'+path,status:'PASS rendered authenticated synthetic context',scope:'page rendering, not provider certification'});
  }
  await page.goto(origin+'/documents');const settings=page.locator('[data-document-authority-settings]');await settings.waitFor();
  assert.equal(await settings.evaluate(e=>e.open),false);assert.equal(await settings.getByRole('button').first().isVisible(),false);
  let mutations=0;await page.route('**/api/connections/google/connect',async route=>{mutations++;await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({success:false,code:'PRIVATE_TOKEN_MUST_NOT_ESCAPE',message:'private diagnostic sentinel'})});});
  await settings.locator('summary').click();await settings.getByRole('button',{name:'Associer mon compte Google',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'DOCUMENT_REQUEST_FAILED'}).waitFor();assert.equal(mutations,1);assert.ok(!(await page.locator('body').innerText()).includes('private diagnostic sentinel'));assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_TOKEN_MUST_NOT_ESCAPE'));
  await page.getByRole('alert').filter({hasText:'DOCUMENT_REQUEST_FAILED'}).screenshot({path:out+'/filtered-diagnostic.png'});
  await page.unroute('**/api/connections/google/connect');
  for(const locale of ['fr','en','es','de','it']){
   await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);await page.goto(origin+'/documents');await page.locator('[data-document-authority-settings] summary').waitFor();
   const label=JSON.parse(readFileSync('src/i18n/messages/'+locale+'/consolidated-ui.json','utf8')).documentAuthoritySettings;
   assert.equal(await page.locator('[data-document-authority-settings] summary').innerText(),label);
  }
  await context.addCookies([{name:'NEXT_LOCALE',value:'fr',url:origin}]);await page.setViewportSize({width:390,height:844});await page.goto(origin+'/documents');
  await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();const image=page.locator('aside img[src="/brand/clara-os-symbol.svg"]');await image.waitFor();assert.equal(await image.evaluate(e=>e.complete&&e.naturalWidth>0),true);
  await page.locator('aside').evaluate(async e=>{await new Promise(requestAnimationFrame);await Promise.all(e.getAnimations().map(a=>a.finished));});
  assert.equal(Math.round((await page.locator('aside').boundingBox()).x),0);
  await page.screenshot({path:out+'/navigation-mobile.png',fullPage:true});await page.getByRole('link',{name:'Missions',exact:true}).click();await page.waitForURL(origin+'/missions');
  await page.screenshot({path:out+'/missions-mobile.png',fullPage:true});
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+process.env.NATIVE_TEST_DATABASE,'utf8'),'','No unexpected global loader may execute during the native UI receipt');
  writeFileSync(out+'/results.json',JSON.stringify({environment:'isolated PostgreSQL, real Next endpoints, providers simulated; no Production certification',results},null,2)+'\n');
 }finally{await browser.close();}
});
