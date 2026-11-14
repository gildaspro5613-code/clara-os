import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {X509Certificate,createHash} from 'node:crypto';
import {seedGoogleWork} from './helpers/native-google-work-fixture.ts';
import {revealAgendaSettings} from './helpers/native-ui-disclosures.mjs';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Disposable native HTTPS/PostgreSQL required');
const pg=s=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
const out=process.env.AGENDA_PRESENTATION_EVIDENCE;
test('Agenda presentation: Paris clock/midnight, real native Calendar states, lazy controls, five locales and responsive layout',{timeout:180000},async()=>{
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');seedGoogleWork(pg);
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64')]});
 if(out)mkdirSync(out,{recursive:true});const results=[],hydration=[],autoWrites=[];
 const stateFile='/tmp/native-fixture-google-state-'+db,change=f=>{const s=JSON.parse(readFileSync(stateFile,'utf8'));f(s);writeFileSync(stateFile,JSON.stringify(s));};
 change(s=>{s.workspace={calendars:{'calendar-a':{id:'calendar-a',summary:'Agenda de travail autorisé',etag:'"a1"',accessRole:'owner'}},events:{'calendar-a/reunion':{id:'reunion',summary:'Réunion de préparation',location:'Angers',start:{dateTime:'2026-11-03T09:00:00Z'},end:{dateTime:'2026-11-03T10:00:00Z'}}},files:{},writes:[],generated:0};});
 const create=async()=>{const r=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{origin,cookie:'clara_auth_session='+'A'.repeat(43),'Content-Type':'application/json'},body:JSON.stringify({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'})});assert.equal(r.status,200);return (await r.json()).data;};
 const none=await create(),selected=await create(),calendarMissing=await create();
 const cookie=scope=>'clara_auth_session='+'A'.repeat(43)+'; clara_native_selection='+encodeURIComponent(JSON.stringify(scope));
 const call=(scope,path,body)=>fetch(origin+path,{method:body?'POST':'GET',headers:{cookie:cookie(scope),origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await call(selected,'/api/native/runtime',{action:'createMission',title:'Préparer la journée',objective:'Consulter le calendrier autorisé.'})).status,200);
 for(const scope of [selected,calendarMissing])assert.equal((await call(scope,'/api/connections/google',{action:'select',connectionId:'google-work-a'})).status,200);
 const inspect=await call(selected,'/api/native/google/work',{action:'inspect',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a'});assert.equal(inspect.status,200);const version=(await inspect.json()).resource.version;
 assert.equal((await call(selected,'/api/native/google/work',{action:'bind',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a',version})).status,200);
 const dictionaries=l=>JSON.parse(readFileSync('src/i18n/messages/'+l+'/index.json','utf8'));
 async function context(scope,locale='fr',viewport={width:1440,height:1000},auth=true){
  const c=await browser.newContext({viewport,timezoneId:'America/Los_Angeles'});await c.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin},{name:'clara_native_selection',value:encodeURIComponent(JSON.stringify(scope)),url:origin},...(auth?[{name:'clara_auth_session',value:'A'.repeat(43),url:origin}]:[])]);
  await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await c.newPage();p.on('console',m=>{if(/hydration|didn.t match|server rendered/i.test(m.text()))hydration.push(m.text());});p.on('pageerror',e=>hydration.push(e.message));
  p.on('request',r=>{if(r.method()!=='GET'&&r.method()!=='HEAD'&&/\/api\//.test(new URL(r.url()).pathname))autoWrites.push(new URL(r.url()).pathname);});return {c,p};
 }
 try{
  // Browser is in California; business day is Paris, even with no Google selection.
  const {c:clockContext,p:clock}=await context(none);await clock.clock.install({time:new Date('2026-11-03T22:59:58Z')});await clock.clock.pauseAt(new Date('2026-11-03T22:59:59Z'));
  await clock.goto(origin+'/');await clock.getByText('Mardi 3 novembre 2026',{exact:true}).waitFor();await clock.getByText(dictionaries('fr').cockpitUi.agendaConnectionRequired,{exact:true}).waitFor();
  const changed=clock.waitForRequest(r=>new URL(r.url()).pathname==='/api/calendar'&&new URL(r.url()).searchParams.get('timeMin')==='2026-11-03T23:00:00.000Z');await clock.clock.runFor(1010);await changed;await clock.getByText('Mercredi 4 novembre 2026',{exact:true}).waitFor();
  await clock.clock.setSystemTime(new Date('2026-11-05T12:00:00Z'));await clock.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await clock.getByText('Jeudi 5 novembre 2026',{exact:true}).waitFor();await clockContext.close();results.push('Paris midnight and tab resume PASS, independent of Google');
  for(const locale of ['fr','en','es','de','it'])for(const [device,width,height]of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]]){
   const {c,p}=await context(selected,locale,{width,height});await p.clock.setFixedTime(new Date('2026-11-03T12:00:00Z'));
   for(const path of ['/','/agenda']){
    await p.goto(origin+path);if(path==='/agenda')await p.getByRole('button',{name:dictionaries(locale).agendaCalendar.day,exact:true}).click();await p.locator('[data-business-date][datetime="2026-11-03"]').waitFor();const date=await p.locator('[data-business-date]').innerText();const full=new Intl.DateTimeFormat(locale,{timeZone:'Europe/Paris',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date('2026-11-03T12:00:00Z'));assert.equal(date,full[0].toLocaleUpperCase(locale)+full.slice(1));assert.equal(await p.locator('[data-business-date]').getAttribute('datetime'),'2026-11-03');
    await p.getByText('Réunion de préparation',{exact:true}).waitFor();const eventTime=new Intl.DateTimeFormat(locale,{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).format(new Date('2026-11-03T09:00:00Z'));await p.getByText(path==='/agenda'?new RegExp('^'+eventTime+' – '):eventTime,{exact:path!=='/agenda'}).first().waitFor();
    if(path==='/agenda'){assert.equal(await p.locator('[data-agenda-settings]').count(),0);assert.equal(await p.locator('#native-google-document-authority').count(),0);await p.locator('.agenda-event').filter({hasText:'Réunion de préparation'}).first().click();const details=p.getByRole('dialog');await details.getByText('Angers',{exact:true}).waitFor();await details.getByRole('button',{name:dictionaries(locale).agendaCalendar.close,exact:true}).click();}
    assert.ok(await p.locator('#main-workspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1),locale+' '+device+' '+path);
    if(out&&locale==='fr'&&path==='/'){await p.screenshot({path:`${out}/cockpit-${device}-top-after.png`});await p.locator('[data-business-date]').scrollIntoViewIfNeeded();}
    if(out&&locale==='fr')await p.screenshot({path:`${out}/${path==='/'?'cockpit':'agenda'}-${device}-after.png`});results.push({locale,device,path,date,result:'PASS, native PostgreSQL; Google simulated'});
   }
   if(locale==='fr'){
    const before=autoWrites.length;await revealAgendaSettings(p);const advanced=p.locator('[data-agenda-settings]');await advanced.locator('#native-agenda-writes').waitFor();await advanced.getByRole('button',{name:'Enregistrer la proposition sans exécuter',exact:true}).waitFor();
    assert.equal(await advanced.getByRole('button',{name:'Confirmer et exécuter une seule fois',exact:true}).count(),0,'No execution without the existing proposal/confirmation flow');
    assert.equal(autoWrites.length,before,'Opening settings issues no POST/OAuth/mutation');
    const outside=await advanced.locator('input,select,textarea,button').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.left<0||r.right>innerWidth+1;}).map(n=>n.tagName));assert.deepEqual(outside,[],'Advanced controls fit '+device);
    if(out)await advanced.screenshot({path:`${out}/advanced-${device}.png`});
   }
   await c.close();console.info('AGENDA_VIEWPORT_PASS',locale,device);
  }
  // Full native endpoint responses distinguish empty success from missing selection/refusal.
  const cases=[['no-connection',none,503,'agendaConnectionRequired'],['no-calendar',calendarMissing,503,'agendaCalendarRequired'],['reconnect',selected,403,'agendaReconnectRequired'],['denied',selected,403,'agendaAccessDenied'],['unavailable',selected,503,'agendaTemporarilyUnavailable'],['empty',selected,200,null]];
  for(const [name,scope,status,key]of cases){
   pg("UPDATE clara_connections SET status='"+(name==='reconnect'?'RECONNECT_REQUIRED':'ACTIVE')+"' WHERE id='google-work-a'");
   change(s=>{s.workspace.unavailable=name==='unavailable';s.workspace.calendars['calendar-a'].accessRole=name==='denied'?'freeBusyReader':'owner';if(name==='empty')s.workspace.events={};});
   const {c,p}=await context(scope);await p.clock.setFixedTime(new Date('2026-11-03T12:00:00Z'));const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/calendar');await p.goto(origin+'/agenda');assert.equal((await response).status(),status,name);
   const area=p.locator('[data-agenda-events]');if(key){await area.getByText(key==='agendaConnectionRequired'?dictionaries('fr').agendaCalendar.connectionRequired:key==='agendaCalendarRequired'?dictionaries('fr').agendaCalendar.calendarRequired:dictionaries('fr').cockpitUi[key],{exact:true}).waitFor();assert.equal(await area.getByText(dictionaries('fr').agendaCalendar.empty,{exact:true}).count(),0);const button=area.locator('[data-agenda-read-state]').getByRole('link');await button.click();await p.waitForFunction(()=>document.getElementById('google-agenda-administration')?.open);assert.equal(await p.locator('[data-agenda-settings]').evaluate(e=>e.open),true);}
   else await area.getByText(dictionaries('fr').agendaCalendar.empty,{exact:true}).waitFor();
   if(out&&name==='no-connection'){for(const [device,width,height]of [['desktop',1440,1000],['mobile',390,844]]){await p.setViewportSize({width,height});await p.goto(origin+'/agenda');await p.locator('[data-agenda-read-state]').waitFor();await p.screenshot({path:`${out}/agenda-no-google-${device}-after.png`});await p.goto(origin+'/');await p.getByText(dictionaries('fr').cockpitUi.agendaConnectionRequired,{exact:true}).waitFor();await p.locator('[data-business-date]').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/cockpit-no-google-${device}-after.png`});}}
   await c.close();results.push({state:name,status,result:'PASS real native route, simulated provider only where accessed'});
  }
  const {c:signedOut,p:signedOutPage}=await context(selected,'fr',{width:390,height:844},false);await signedOutPage.goto(origin+'/agenda');await signedOutPage.locator('[data-agenda-events]').getByText(dictionaries('fr').cockpitUi.agendaSessionExpired,{exact:true}).waitFor();assert.equal(await signedOutPage.getByRole('link',{name:dictionaries('fr').agendaPage.signIn,exact:true}).getAttribute('href'),'/api/auth/google/start');await signedOut.close();
  assert.deepEqual(autoWrites,[],'No browser action above submits OAuth or a write');assert.deepEqual(hydration,[],'No hydration mismatch or client crash');assert.equal(JSON.parse(readFileSync(stateFile,'utf8')).workspace.writes.length,0);
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');if(out)writeFileSync(out+'/results.json',JSON.stringify({providerCertified:false,results,hydrationErrors:0,automaticMutations:0},null,2)+'\n');
 }finally{await browser.close();}
});
