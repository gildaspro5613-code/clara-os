import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {X509Certificate,createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {seedGoogleWork} from './helpers/native-google-work-fixture.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Disposable local native fixture required');
const out=process.env.GOOGLE_HUB_EVIDENCE??'/tmp/google-hub-216';
test('Google hub: real owner/delegate authority and revocation, explicit selection, native statuses, five locales and legacy cards',async()=>{
 const pg=sql=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{stdio:'pipe',encoding:'utf8'});
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 seedGoogleWork(sql=>pg(sql.replaceAll('google-work-a','hub-216-owner').replaceAll('google-work-b','hub-216-other')));
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 mkdirSync(out,{recursive:true});const results=[];
 try{
  const setup=async user=>{const c=await browser.newContext({viewport:{width:1440,height:1000}});await c.addCookies([{name:'clara_auth_session',value:user.repeat(43),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
   // Only non-Google status transports are fixtures. Google's native handlers/SQL stay real.
   await c.route('**/api/connections/microsoft',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({connected:true,status:'ACTIVE'})}));
   await c.route('**/api/connections/make/status',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({connected:true,status:'ACTIVE',scenarioKeys:['synthetic']})}));
   const created=await c.request.post(origin+'/api/native/runtime',{headers:{origin},data:{action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'}});assert.equal(created.status(),200);return c;};
  const owner=await setup('A'),page=await owner.newPage(),card=page.locator('article').filter({has:page.getByRole('heading',{name:'Google Workspace',exact:true})});
  const post=(ctx,body)=>ctx.request.post(origin+'/api/connections/google',{headers:{origin},data:body});
  await page.goto(origin+'/connexions');await card.getByText('Sélection requise',{exact:true}).waitFor();
  assert.equal((await post(owner,{action:'select',connectionId:'hub-216-other'})).status(),403);
  assert.equal((await post(owner,{action:'select',connectionId:'hub-216-owner'})).status(),200);
  await page.reload();await card.getByText('Connexion sélectionnée',{exact:true}).waitFor();assert.equal(await card.getByText('Connecté',{exact:true}).count(),0);
  await page.screenshot({path:out+'/owner-selected.png',fullPage:true});
  await page.reload();await card.getByText('Connexion sélectionnée',{exact:true}).waitFor();
  const list=await(await owner.request.get(origin+'/api/connections/google')).json();assert.equal(list.selectedConnectionId,'hub-216-owner');assert.ok(list.connections.some(c=>c.id==='hub-216-owner'&&c.owned));assert.ok(!list.connections.some(c=>c.id==='hub-216-other'));
  const delegate=await setup('B');assert.equal((await post(owner,{action:'delegate',connectionId:'hub-216-owner',userId:'b'})).status(),200);
  const delegated=await(await delegate.request.get(origin+'/api/connections/google')).json();assert.ok(delegated.connections.some(c=>c.id==='hub-216-owner'&&c.owned===false));
  assert.equal((await post(delegate,{action:'select',connectionId:'hub-216-owner'})).status(),200);
  const dpage=await delegate.newPage();await dpage.goto(origin+'/connexions');await dpage.getByText('Connexion sélectionnée',{exact:true}).waitFor();
  assert.equal((await post(owner,{action:'revokeDelegation',connectionId:'hub-216-owner',userId:'b'})).status(),200);
  await dpage.reload();await dpage.getByText('Sélection à revoir',{exact:true}).waitFor();assert.equal((await post(delegate,{action:'select',connectionId:'hub-216-owner'})).status(),403);
  assert.equal((await owner.request.get(origin+'/api/connections/google?workspaceId=w&clientId=c1&projectId=p2&sessionId='+encodeURIComponent('native:foreign'))).status(),403);
  results.push('real native SQL: owner, foreign-owner denial, delegate, revocation, reload and no automatic fallback');
  assert.equal((await post(owner,{action:'revoke',connectionId:'hub-216-owner'})).status(),200);await page.reload();await card.getByText('Sélection à revoir',{exact:true}).waitFor();
  const guest=await browser.newContext();await guest.addCookies([{name:'NEXT_LOCALE',value:'fr',url:origin}]);await guest.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());await guest.route('**/api/connections/microsoft',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'MICROSOFT_WORKSPACE_AUTH_REQUIRED'})}));const gpage=await guest.newPage();await gpage.goto(origin+'/connexions');await gpage.locator('article').filter({has:gpage.getByRole('heading',{name:'Google Workspace',exact:true})}).getByText('Authentification requise',{exact:true}).waitFor();await guest.close();
  const native=(status,selected='synthetic')=>({success:true,connections:[{id:'synthetic',status,owned:true}],selectedConnectionId:selected});
  const cases=[['selected',200,native('ACTIVE')],['selectionRequired',200,native('ACTIVE',null)],['selectionUnavailable',200,{success:true,connections:[],selectedConnectionId:'synthetic'}],['reconnect',200,native('RECONNECT_REQUIRED')],['pending',200,native('PENDING_AUTHENTICATION')],['none',200,{success:true,connections:[],selectedConnectionId:null}],['authRequired',401,{success:false,code:'AUTHENTICATED_OS_SESSION_REQUIRED'}],['denied',403,native('ACTIVE')],['unavailable',503,{success:false,code:'PRIVATE_SENTINEL',message:'PRIVATE_SENTINEL'}],['unavailable',200,{connected:true,status:'ACTIVE'}]];
  for(const [state,status,body] of cases){await page.route('**/api/connections/google',r=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}));await page.goto(origin+'/connexions');const ui=JSON.parse(readFileSync('src/i18n/messages/fr/consolidated-ui.json','utf8'));await card.getByText(ui['googleHub_'+state],{exact:true}).waitFor();assert.equal(await card.getByText('Connecté',{exact:true}).count(),0);assert.ok(!(await card.innerText()).includes('PRIVATE_SENTINEL'));await card.getByRole('link',{name:ui.googleHub_documents,exact:true}).waitFor();await page.screenshot({path:out+'/'+state+'.png',fullPage:true});results.push('presentation fixture '+state+' HTTP '+status);await page.unroute('**/api/connections/google');}
  await page.route('**/api/connections/google',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(native('ACTIVE'))}));
  for(const locale of ['fr','en','es','de','it']){await owner.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin}]);await page.goto(origin+'/connexions');const ui=JSON.parse(readFileSync('src/i18n/messages/'+locale+'/consolidated-ui.json','utf8'));await card.getByText(ui.googleHub_selected,{exact:true}).waitFor();for(const name of ['Microsoft 365 · Windows 365','Make'])await page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})}).getByText(ui.connected,{exact:true}).waitFor();}
  await owner.addCookies([{name:'NEXT_LOCALE',value:'fr',url:origin}]);await owner.unroute('**/api/connections/microsoft');await owner.unroute('**/api/connections/make/status');
  await owner.route('**/api/connections/microsoft',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'MICROSOFT_WORKSPACE_AUTH_REQUIRED'})}));
  await owner.route('**/api/connections/make/status',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'UNAVAILABLE',connected:false})}));
  await page.goto(origin+'/connexions');await page.locator('article').filter({has:page.getByRole('heading',{name:'Microsoft 365 · Windows 365',exact:true})}).getByText('Authentification requise',{exact:true}).waitFor();await page.locator('article').filter({has:page.getByRole('heading',{name:'Make',exact:true})}).locator('span').filter({hasText:/^Indisponible$/}).waitFor();await page.screenshot({path:out+'/legacy-errors.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png',fullPage:true});
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
  writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',productionOrProviderCertified:false,googleAuthority:'real native handlers and disposable PostgreSQL; provider clients not invoked',legacyCards:'status fixtures only, not provider certification',results},null,2)+'\n');
 }finally{await browser.close();}
});
