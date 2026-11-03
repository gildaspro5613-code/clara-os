import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {X509Certificate,createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {seedGoogleWork,workScopes} from './helpers/native-google-work-fixture.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Disposable HTTPS/PostgreSQL only');
const pg=s=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
test('Google reconnect UI: real status refusal, same connection and scopes, no private identifiers, owner-only consent',{timeout:90000},async()=>{
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');seedGoogleWork(pg);
 const stateFile='/tmp/native-fixture-google-state-'+db,state=JSON.parse(readFileSync(stateFile,'utf8')),now=Date.now();state.workspace={calendars:{'calendar-a':{id:'calendar-a',summary:'Agenda autorisé de test',etag:'"calendar-a-1"',accessRole:'owner'}},events:{'calendar-a/preparation':{id:'preparation',summary:'Préparer la journée',start:{dateTime:new Date(now).toISOString()},end:{dateTime:new Date(now+1800000).toISOString()}}},files:{},writes:[],generated:0};writeFileSync(stateFile,JSON.stringify(state));
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64')]});
 const evidence=process.env.GOOGLE_RECONNECT_EVIDENCE;if(evidence)mkdirSync(evidence,{recursive:true});
 const created=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{origin,cookie:'clara_auth_session='+'A'.repeat(43),'Content-Type':'application/json'},body:JSON.stringify({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'})});assert.equal(created.status,200);const scope=(await created.json()).data;
 const cookie='clara_auth_session='+'A'.repeat(43)+'; clara_native_selection='+encodeURIComponent(JSON.stringify(scope));
 const post=(path,body)=>fetch(origin+path,{method:'POST',headers:{origin,cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post('/api/native/runtime',{action:'createMission',title:'Préparer la journée',objective:'Consulter le calendrier autorisé sans envoi.'})).status,200);
 assert.equal((await post('/api/connections/google',{action:'select',connectionId:'google-work-a'})).status,200);
 const inspected=await post('/api/native/google/work',{action:'inspect',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a'});assert.equal(inspected.status,200);const version=(await inspected.json()).resource.version;
 assert.equal((await post('/api/native/google/work',{action:'bind',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a',version})).status,200);
 pg("UPDATE clara_connections SET status='RECONNECT_REQUIRED' WHERE id='google-work-a'");const denied=await post('/api/connections/google',{action:'select',connectionId:'google-work-a'});assert.equal(denied.status,403);assert.equal((await denied.json()).code,'NATIVE_GOOGLE_REAUTH_REQUIRED');
 try{
  for(const locale of ['fr','en','es','de','it']){
   const ui=JSON.parse(readFileSync('src/i18n/messages/'+locale+'/consolidated-ui.json','utf8')),context=await browser.newContext({viewport:{width:locale==='fr'?1440:390,height:1000}});
   await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'clara_native_selection',value:encodeURIComponent(JSON.stringify(scope)),url:origin},{name:'NEXT_LOCALE',value:locale,url:origin}]);
   await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   const page=await context.newPage();await page.goto(origin+'/agenda');const panel=page.locator('#native-google-document-authority');await panel.getByText(ui.googleReconnectHelp,{exact:true}).waitFor();
   assert.equal(await panel.getByRole('button',{name:ui.nativeGoogleSelect,exact:true}).isDisabled(),true);assert.ok(!(await panel.innerText()).includes('google-work-a'));
   if(evidence)await panel.screenshot({path:evidence+'/'+locale+'-reconnect.png'});
   if(locale==='fr'){
    const consent=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/connections/google/connect');const navigation=page.waitForRequest(r=>new URL(r.url()).hostname==='accounts.google.com');
    await panel.getByRole('button',{name:ui.googleReconnectAction,exact:true}).click();const response=await consent;assert.equal(response.status(),200);assert.deepEqual(response.request().postDataJSON(),{connectionId:'google-work-a',capability:'reconnect'});const url=new URL((await navigation).url());assert.deepEqual(url.searchParams.get('scope').split(' ').sort(),[...workScopes].sort());
    assert.equal(pg("SELECT status FROM clara_connections WHERE id='google-work-a'"),'RECONNECT_REQUIRED');
    await page.goto(origin+'/');const cockpitLabels=JSON.parse(readFileSync('src/i18n/messages/fr/index.json','utf8')).cockpitUi;await page.getByText(cockpitLabels.agendaReconnectRequired,{exact:true}).waitFor();assert.equal(await page.getByText(cockpitLabels.noAppointments,{exact:true}).count(),0);
   }
   await context.close();
  }
  pg("UPDATE clara_connections SET status='ACTIVE' WHERE id='google-work-a'");assert.equal((await post('/api/connections/google',{action:'select',connectionId:'google-work-a'})).status,200);
  const activeCalendar=await fetch(origin+'/api/calendar',{headers:{cookie}});assert.equal(activeCalendar.status,200);assert.equal((await activeCalendar.json()).events[0].summary,'Préparer la journée');
  pg("UPDATE clara_connections SET scopes='[\"openid\",\"https://www.googleapis.com/auth/drive.readonly\"]' WHERE id='google-work-a'");const missingConsent=await fetch(origin+'/api/calendar',{headers:{cookie}});assert.equal(missingConsent.status,403);const refused=await missingConsent.json();assert.equal(refused.code,'GOOGLE_CONSENT_REQUIRED');assert.equal('events' in refused,false);pg("UPDATE clara_connections SET scopes='"+JSON.stringify(workScopes)+"' WHERE id='google-work-a'");
  // A listed delegated connection is still not consent authority for the delegate.
  const other=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{origin,cookie:'clara_auth_session='+'B'.repeat(43),'Content-Type':'application/json'},body:JSON.stringify({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'})});assert.equal(other.status,200);const b=(await other.json()).data;
  assert.equal((await post('/api/connections/google',{action:'delegate',connectionId:'google-work-a',userId:'b'})).status,200);pg("UPDATE clara_connections SET status='RECONNECT_REQUIRED' WHERE id='google-work-a'");
  const context=await browser.newContext();await context.addCookies([{name:'clara_auth_session',value:'B'.repeat(43),url:origin},{name:'clara_native_selection',value:encodeURIComponent(JSON.stringify(b)),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await context.newPage();await page.goto(origin+'/agenda');const ui=JSON.parse(readFileSync('src/i18n/messages/fr/consolidated-ui.json','utf8'));await page.getByLabel(ui.nativeGoogleConnection,{exact:true}).selectOption('google-work-a');await page.getByText(ui.googleReconnectOwnerHelp,{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:ui.googleReconnectAction,exact:true}).count(),0);await context.close();
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
 }finally{await browser.close();}
});
