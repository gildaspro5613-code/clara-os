import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {X509Certificate,createHash} from 'node:crypto';
import {seedGoogleWork,workScopes} from './helpers/native-google-work-fixture.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Isolated native PostgreSQL/HTTPS fixture required');
const pg=s=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
test('Cockpit existing capabilities: authorized Calendar read and refusals, unavailable weather, real local Waze preparation, native voice authority probes without provider invocation',{timeout:120000},async()=>{
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');seedGoogleWork(pg);
 const path='/tmp/native-fixture-google-state-'+db,change=fn=>{const s=JSON.parse(readFileSync(path,'utf8'));fn(s);writeFileSync(path,JSON.stringify(s));};
 const now=Date.now();change(s=>{s.workspace={calendars:{'calendar-a':{id:'calendar-a',summary:'Agenda de préparation',etag:'"calendar-a-1"',accessRole:'owner'}},files:{},events:{'calendar-a/preparation':{id:'preparation',summary:'Réunion de préparation technique',start:{dateTime:new Date(now).toISOString()},end:{dateTime:new Date(now+1800000).toISOString()}}},writes:[],generated:0};});
 const labels=JSON.parse(readFileSync('src/i18n/messages/fr/index.json','utf8')).cockpitUi;
 const auth='clara_auth_session='+'A'.repeat(43),create=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:auth,origin,'Content-Type':'application/json'},body:JSON.stringify({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'})});assert.equal(create.status,200);const selection=(await create.json()).data,cookie=auth+'; clara_native_selection='+encodeURIComponent(JSON.stringify(selection));
 const call=(path,body,customCookie=cookie)=>fetch(origin+path,{method:body?'POST':'GET',headers:{cookie:customCookie,origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await call('/api/native/runtime',{action:'createMission',title:'Préparer la prestation d’Angers',objective:'Vérifier les besoins techniques, les documents et les échéances.'})).status,200);
 assert.equal((await call('/api/connections/google',{action:'select',connectionId:'google-work-a'})).status,200);
 const inspected=await call('/api/native/google/work',{action:'inspect',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a'});assert.equal(inspected.status,200);const version=(await inspected.json()).resource.version;
 assert.equal((await call('/api/native/google/work',{action:'bind',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a',version})).status,200);
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64'),browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 try{
  const context=await browser.newContext({timezoneId:'Europe/Paris',viewport:{width:1440,height:1000}});await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'clara_native_selection',value:encodeURIComponent(JSON.stringify(selection)),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.addInitScript(()=>{window.__microphoneCalls=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>{window.__microphoneCalls++;throw Error('No microphone in isolated receipt');}}});});
  const page=await context.newPage(),requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));
  change(s=>{s.workspace.calendars['calendar-a'].accessRole='reader';});
  const agendaResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/calendar');await page.goto(origin+'/');const calendar=await agendaResponse;assert.equal(calendar.status(),200);const body=await calendar.json();assert.equal(body.calendarId,'calendar-a');assert.equal(body.events[0].summary,'Réunion de préparation technique');
  await page.getByText('Réunion de préparation technique',{exact:true}).waitFor();await page.getByText(labels.weatherTemporarilyUnavailable,{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__microphoneCalls),0);assert.ok(!requests.some(p=>/elevenlabs/.test(p))); // Read-only voice probes are legitimate; microphone starts only on explicit user action.
  const weather=await call('/api/weather?location=Angers');assert.equal(weather.status,502);assert.equal((await weather.json()).success,false);
  const evidence=process.env.COCKPIT_CAPABILITIES_EVIDENCE;if(evidence){mkdirSync(evidence,{recursive:true});for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){await page.setViewportSize({width,height});await page.goto(origin+'/');await page.getByText('Réunion de préparation technique',{exact:true}).waitFor();await page.screenshot({path:evidence+'/'+name+'-hero.png'});await page.getByText('Réunion de préparation technique',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:evidence+'/'+name+'-agenda.png'});}}
  // Existing connector refusals must not become empty appointments.
  change(s=>{s.workspace.unavailable=true;});await page.reload();await page.getByText(labels.agendaTemporarilyUnavailable,{exact:true}).waitFor();assert.equal(await page.getByText(labels.noAppointments,{exact:true}).count(),0);change(s=>{s.workspace.unavailable=false;});
  change(s=>{s.workspace.calendars['calendar-a'].accessRole='freeBusyReader';});assert.equal((await call('/api/calendar')).status,403);change(s=>{s.workspace.calendars['calendar-a'].accessRole='reader';});
  pg("UPDATE clara_connections SET scopes='[\"openid\",\"https://www.googleapis.com/auth/drive.readonly\"]' WHERE id='google-work-a'");assert.equal((await call('/api/calendar')).status,403);pg("UPDATE clara_connections SET scopes='"+JSON.stringify(workScopes)+"' WHERE id='google-work-a'");
  assert.equal((await call('/api/calendar',undefined,cookie.replace('A'.repeat(43),'B'.repeat(43)))).status,403);assert.equal((await call('/api/calendar',undefined,'')).status,401);
  await page.reload();await page.getByText('Réunion de préparation technique',{exact:true}).waitFor();const destination=page.getByPlaceholder('Destination…',{exact:true});await destination.fill('Angers');const [waze,popup]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/waze'),page.waitForEvent('popup'),page.getByRole('button',{name:'Go',exact:true}).click()]);assert.equal(waze.status(),200);const prepared=await waze.json();assert.equal(new URL(prepared.url).hostname,'waze.com');assert.equal(new URL(prepared.url).searchParams.get('q'),'Angers');await popup.close();
  await context.route('**/api/waze?**',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})}));await page.getByRole('button',{name:'Go',exact:true}).click();await page.getByText(labels.navigationTemporarilyUnavailable,{exact:true}).waitFor();
  assert.equal((await call('/api/connections/google',{action:'revoke',connectionId:'google-work-a'})).status,200);assert.equal((await call('/api/calendar')).status,403);await page.reload();await page.getByText(labels.agendaTemporarilyUnavailable,{exact:true}).waitFor();
  assert.equal(JSON.parse(readFileSync(path,'utf8')).workspace.writes.length,0,'Read-only agenda never mutates the provider');assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');await context.close();
 }finally{await browser.close();}
});
