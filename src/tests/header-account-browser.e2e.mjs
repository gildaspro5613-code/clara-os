import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {X509Certificate,createHash} from 'node:crypto';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {verifiedGoogleDisplayCookie} from '../lib/auth/google-display-name.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Isolated HTTPS/PostgreSQL fixture required');
const pg=s=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
test('historical header account: 5 locales × 3 viewports, native profile, keyboard/outside close, existing language setting and real logout',{timeout:180000},async()=>{
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 const nameCookie=verifiedGoogleDisplayCookie('A'.repeat(43),'Gildas',true);
 const call=(path,body)=>fetch(origin+path,{method:body?'POST':'GET',headers:{cookie:'clara_auth_session='+'A'.repeat(43),origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const created=await call('/api/native/runtime',{action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'});assert.equal(created.status,200);const selected=(await created.json()).data;
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 const evidence=process.env.ACCOUNT_MENU_EVIDENCE;if(evidence)mkdirSync(evidence,{recursive:true});
 const formats={desktop:{width:1440,height:1100},tablet:{width:820,height:1180},mobile:{width:390,height:844}};
 const cookies=locale=>[{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'clara_native_selection',value:encodeURIComponent(JSON.stringify(selected)),url:origin},{name:'NEXT_LOCALE',value:locale,url:origin},{name:nameCookie.name,value:nameCookie.value,url:origin}];
 try{
  for(const locale of ['fr','en','es','de','it'])for(const [format,viewport]of Object.entries(formats)){
   const messages=JSON.parse(readFileSync('src/i18n/messages/'+locale+'/index.json','utf8'));
   const context=await browser.newContext({viewport});await context.addCookies(cookies(locale));await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
   const page=await context.newPage();await page.goto(origin+'/');const trigger=page.locator('header').getByRole('button',{name:messages.common.profile,exact:true});
   const before=await page.locator('header').evaluate(header=>[...header.querySelectorAll('a,select,button[aria-haspopup="dialog"]')].map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,label:el.getAttribute('aria-label'),href:el.getAttribute('href'),x:r.x,y:r.y,width:r.width,height:r.height};}));
   const box=await trigger.boundingBox();assert.equal(box.width,40);assert.equal(box.height,40);
   await trigger.focus();await trigger.press('Enter');const menu=page.getByRole('dialog',{name:messages.account.title,exact:true});await menu.waitFor();await menu.locator('[data-account-name]').getByText('Gildas',{exact:true}).waitFor();await menu.locator('[data-account-google]').getByText(messages.account.googleLinked,{exact:true}).waitFor();
   const rect=await menu.boundingBox();assert.ok(rect.x>=8&&rect.x+rect.width<=viewport.width-8);assert.ok(rect.y>=box.y+box.height);assert.ok(rect.y+rect.height<=viewport.height);assert.ok(rect.width<=289);
   assert.equal(await trigger.getAttribute('aria-expanded'),'true');assert.ok(!(await menu.innerText()).includes('google-a'));assert.ok(!(await menu.innerText()).includes('encryptedPayload'));assert.ok(!(await menu.innerText()).includes(selected.sessionId));
   assert.deepEqual(await page.locator('header').evaluate(header=>[...header.querySelectorAll('a,select,button[aria-haspopup="dialog"]')].map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,label:el.getAttribute('aria-label'),href:el.getAttribute('href'),x:r.x,y:r.y,width:r.width,height:r.height};})),before,'Opening the popover must not move any header element');
   await menu.locator('summary').first().focus();await page.keyboard.press('ArrowDown');assert.equal(await menu.locator('summary').nth(1).evaluate(el=>el===document.activeElement),true);
   await page.keyboard.press('End');assert.equal(await menu.getByRole('button',{name:messages.common.logout,exact:true}).evaluate(el=>el===document.activeElement),true);
   if(evidence&&locale==='fr')await page.screenshot({path:evidence+'/'+format+'-open.png'});
   await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('header button[aria-haspopup="dialog"]')?.getAttribute('aria-expanded')==='false');assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
   await trigger.click();await menu.waitFor();await page.locator('header > div').first().click({position:{x:5,y:5}});await menu.waitFor({state:'hidden'});
   await trigger.click();await menu.waitFor();await menu.getByRole('button',{name:new RegExp(messages.account.preferences)}).click();await menu.waitFor({state:'hidden'});assert.equal(await page.locator('header select').evaluate(el=>el===document.activeElement),true);
   await context.close();
  }
  // Actual same-origin logout on the real endpoint and database; a failed
  // transport must never report a successful logout or clear the current view.
  const context=await browser.newContext({viewport:formats.desktop});await context.addCookies(cookies('fr'));await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
  const page=await context.newPage();await page.goto(origin+'/');const trigger=page.locator('header').getByRole('button',{name:'Profil',exact:true}),menu=page.getByRole('dialog',{name:'Compte utilisateur',exact:true});
  const foreign=await page.request.post(origin+'/api/auth/session/logout',{headers:{origin:'https://foreign.invalid'}});assert.equal(foreign.status(),403);
  const digest=createHash('sha256').update('A'.repeat(43)).digest('hex');assert.equal(pg("SELECT revoked_at IS NULL FROM clara_auth_sessions WHERE token_hash='"+digest+"'"),'t');
  await trigger.click();await menu.locator('[data-account-name]').getByText('Gildas',{exact:true}).waitFor();
  await page.route('**/api/auth/session/logout',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'PRIVATE_FAILURE_SENTINEL'})}));
  page.once('dialog',dialog=>dialog.accept());await menu.getByRole('button',{name:'Déconnexion',exact:true}).click();await menu.getByRole('alert').waitFor();assert.ok(!(await menu.innerText()).includes('PRIVATE_FAILURE_SENTINEL'));assert.equal(pg("SELECT revoked_at IS NULL FROM clara_auth_sessions WHERE token_hash='"+digest+"'"),'t');
  await page.unroute('**/api/auth/session/logout');page.once('dialog',dialog=>dialog.accept());await Promise.all([page.waitForURL(origin+'/'),menu.getByRole('button',{name:'Déconnexion',exact:true}).click()]);
  await page.locator('[data-native-authority="locked"]').waitFor();assert.equal(pg("SELECT revoked_at IS NOT NULL FROM clara_auth_sessions WHERE token_hash='"+digest+"'"),'t');assert.equal((await context.cookies()).some(c=>(c.name==='clara_auth_session'||c.name===nameCookie.name)&&c.value!==''),false);
  await page.goto(origin+'/missions');await page.locator('[data-native-authority="locked"]').waitFor();assert.equal((await page.request.get(origin+'/api/native/runtime')).status(),401);
  assert.equal((await fetch(origin+'/api/native/runtime',{headers:{cookie:'clara_auth_session='+'A'.repeat(43)+'; clara_native_selection='+encodeURIComponent(JSON.stringify(selected))}})).status,403,'The old revoked bearer cannot recover business data');
  await context.close();assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
 }finally{await browser.close();}
});
