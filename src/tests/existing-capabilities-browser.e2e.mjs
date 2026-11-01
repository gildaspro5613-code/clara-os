import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash,X509Certificate,randomUUID} from 'node:crypto';
import {seedGoogleWork} from './helpers/native-google-work-fixture.ts';
import {seedNativeMailFixture,SimulatedMail} from './helpers/native-mail-fixture.ts';
import {withNativeScope} from '../lib/native/scoped-context.ts';
import {NativeMail} from '../lib/native/mail.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Disposable HTTPS fixture only');
const pg=s=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
const query=async(strings,...values)=>{const s=strings.reduce((s,p,i)=>s+p+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');return pg(`SELECT row_to_json(r) FROM (${s})r`).split('\n').filter(Boolean).map(JSON.parse);};
test('existing capabilities: cold voice readiness without bypass, Calendar selection/refusal, Weather normalization, native mail authority, company provenance and cyan scrollbars',{timeout:120000},async()=>{
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');process.env.CLARA_AUTH_APP_ORIGIN=origin;
 writeFileSync('/tmp/native-fixture-weather-'+db,JSON.stringify({mode:'valid'}));
 const auth='clara_auth_session='+'A'.repeat(43);
 const created=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:auth,origin,'Content-Type':'application/json'},body:JSON.stringify({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'})});assert.equal(created.status,200);const scope=(await created.json()).data,selection=created.headers.get('set-cookie').split(';')[0],cookie=auth+'; '+selection;
 const call=(path,body)=>fetch(origin+path,{method:body?'POST':'GET',headers:{cookie,origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await call('/api/native/runtime',{action:'createMission',title:'Préparer la journée de travail',objective:'Consulter les ressources autorisées.'})).status,200);
 assert.equal((await call('/api/calendar')).status,503);assert.equal((await(await call('/api/calendar')).json()).code,'NATIVE_GOOGLE_CONNECTION_REQUIRED');
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin]});
 let releaseCalendar,pageForCleanup;
 try{
  const context=await browser.newContext({viewport:{width:1536,height:1000}});await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'clara_native_selection',value:selection.slice(selection.indexOf('=')+1),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();pageForCleanup=page;const voiceDelay='/tmp/native-fixture-voice-delay-'+db;writeFileSync(voiceDelay,JSON.stringify({delayMs:2200}));
  await page.addInitScript(()=>{window.mics=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>{window.mics++;throw Error('No microphone before explicit authorization');}}});});await page.goto(origin);
  const voice=page.locator('[data-cockpit-hero] button[data-native-voice]').filter({visible:true});await voice.waitFor();await page.waitForTimeout(3500);assert.equal(await voice.isDisabled(),true);await page.waitForFunction(()=>[...document.querySelectorAll('button[data-native-voice]')].some(b=>b.offsetParent&&!b.disabled));assert.equal(await page.evaluate(()=>window.mics),0);
  writeFileSync(voiceDelay,JSON.stringify({delayMs:0}));pg("UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE workspace_id='w' AND project_id='p1' AND user_id='a'");
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.getByText('Ton accès vocal doit être vérifié.',{exact:true}).filter({visible:true}).waitFor();assert.equal(await voice.isDisabled(),true);assert.equal(await page.evaluate(()=>window.mics),0);
  pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE workspace_id='w' AND project_id='p1' AND user_id='a'");await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>[...document.querySelectorAll('button[data-native-voice]')].some(b=>b.offsetParent&&!b.disabled));
  await page.getByText('Choisis une connexion Google autorisée dans Agenda.',{exact:true}).waitFor();assert.equal(await page.getByText('Aucun rendez-vous prévu',{exact:true}).count(),0);
  const weather=await call('/api/weather?location=Angers');assert.equal(weather.status,200);assert.equal((await weather.json()).temperatureC,21);await page.getByText('21°',{exact:true}).waitFor();await page.getByText('Clear',{exact:true}).waitFor();
  writeFileSync('/tmp/native-fixture-weather-'+db,JSON.stringify({mode:'invalid'}));assert.equal((await(await call('/api/weather?location=Angers')).json()).code,'WEATHER_INVALID_RESPONSE');await page.reload();await page.getByText('Météo momentanément indisponible.',{exact:true}).waitFor();assert.equal(await page.getByText('0°',{exact:true}).count(),0);
  // Existing Google selection and binding primitives, no OAuth restart.
  seedGoogleWork(pg);const file='/tmp/native-fixture-google-state-'+db,change=fn=>{const s=JSON.parse(readFileSync(file,'utf8'));fn(s);writeFileSync(file,JSON.stringify(s));};const now=Date.now();change(s=>{s.workspace={calendars:{'calendar-a':{id:'calendar-a',summary:'Agenda autorisé',etag:'"a-1"',accessRole:'reader'}},files:{},events:{'calendar-a/event-a':{id:'event-a',summary:'Rendez-vous de préparation',start:{dateTime:new Date(now).toISOString()},end:{dateTime:new Date(now+1800000).toISOString()}}},writes:[],generated:0};});
  assert.equal((await call('/api/connections/google',{action:'select',connectionId:'google-work-a'})).status,200);assert.equal((await(await call('/api/calendar')).json()).code,'NATIVE_GOOGLE_CALENDAR_REQUIRED');
  const inspected=await call('/api/native/google/work',{action:'inspect',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a'});assert.equal(inspected.status,200);const version=(await inspected.json()).resource.version;assert.equal((await call('/api/native/google/work',{action:'bind',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a',version})).status,200);
  writeFileSync('/tmp/native-fixture-weather-'+db,JSON.stringify({mode:'valid'}));await page.reload();await page.getByText('Rendez-vous de préparation',{exact:true}).waitFor();change(s=>{s.workspace.calendars['calendar-a'].accessRole='freeBusyReader';});await page.reload();await page.getByText('Ce calendrier n’est pas accessible avec tes autorisations actuelles.',{exact:true}).waitFor();change(s=>{s.workspace.calendars['calendar-a'].accessRole='reader';});
  // A buffered authorized response must not reappear after a newer refusal.
  let releaseOld,oldRead;const released=new Promise(resolve=>{releaseOld=resolve;releaseCalendar=resolve;}),read=new Promise(resolve=>{oldRead=resolve;});let first=true;
  await page.route('**/api/calendar?**',async route=>{if(!first)return route.continue();first=false;const response=await route.fetch();assert.equal(response.status(),200);oldRead();await released;await route.fulfill({response}).catch(()=>{});});
  await page.evaluate(()=>window.dispatchEvent(new Event('clara:google-work-updated')));await read;change(s=>{s.workspace.calendars['calendar-a'].accessRole='freeBusyReader';});await page.evaluate(()=>window.dispatchEvent(new Event('clara:google-work-updated')));
  await page.getByText('Ce calendrier n’est pas accessible avec tes autorisations actuelles.',{exact:true}).waitFor();releaseOld();await page.waitForTimeout(200);assert.equal(await page.getByText('Rendez-vous de préparation',{exact:true}).count(),0);await page.unroute('**/api/calendar?**');change(s=>{s.workspace.calendars['calendar-a'].accessRole='reader';});
  // No native authority is inferred from a historical provider connection.
  const empty=await(await call('/api/native/mail?action=overview')).json();assert.equal(empty.overview.length,0);
  seedNativeMailFixture(pg);await withNativeScope(new Request(origin+'/api/native/mail',{headers:{cookie,origin}}),true,async()=>{await(await new NativeMail('mail-clara',()=>new SimulatedMail()).initialize()).sync('INBOX');},query);
  const mail=await(await call('/api/native/mail?action=overview')).json();assert.equal(mail.overview.length,1);assert.equal(mail.overview[0].address,'clara@melodie.digital');assert.equal(mail.freshnessVerified,false);assert.ok(!JSON.stringify(mail).includes('gildas@'));
  await page.reload();await page.getByText('clara@melodie.digital',{exact:true}).filter({visible:true}).waitFor();assert.equal((await call('/api/native/mail',{action:'revoke',connectionId:'mail-clara'})).status,200);await page.reload();await page.getByText('Aucune boîte accessible pour ce projet',{exact:true}).filter({visible:true}).waitFor();
  // Existing Brain + composer receive versioned company evidence; no fictitious offers.
  change(s=>{s.companyReceipt=true;});const beforeMissions=pg('SELECT jsonb_agg(data ORDER BY id) FROM clara_missions');const response=await call('/api/clara/chat',{operationId:randomUUID(),sessionId:scope.sessionId,message:'Présente Mélodie Digital Services, Clara OS et Clara Live et notre priorité commerciale.'});assert.equal(response.status,200,await response.clone().text());
  assert.equal(pg('SELECT jsonb_agg(data ORDER BY id) FROM clara_missions'),beforeMissions);
  const snapshot=await(await call('/api/native/runtime')).json();const company=snapshot.session.sources.find(s=>s.source==='melodie-company-knowledge');assert.ok(company?.available);assert.equal(company.data.workspaceId,'w');assert.ok(company.data.records.every(r=>r.path&&/^[a-f0-9]{64}$/.test(r.sha256)));assert.deepEqual(company.data.records.find(r=>r.path.endsWith('/offers.ts')).content,{});
  const trace=readFileSync('/tmp/native-fixture-company-'+db,'utf8').trim().split('\n').map(JSON.parse);assert.ok(trace.some(t=>t.phase==='reasoning'));assert.ok(trace.some(t=>t.phase==='composer'));assert.ok(trace.every(t=>t.scopePresent));
  await page.reload();const color=await page.locator('.clara-glass-scroll').first().evaluate(el=>getComputedStyle(el).scrollbarColor);assert.equal(color,'rgb(34, 184, 214) rgb(11, 54, 69)');
  if(process.env.CAPABILITIES_EVIDENCE){mkdirSync(process.env.CAPABILITIES_EVIDENCE,{recursive:true});writeFileSync(process.env.CAPABILITIES_EVIDENCE+'/company-provenance.json',JSON.stringify(company.data,null,2));await page.screenshot({path:process.env.CAPABILITIES_EVIDENCE+'/desktop.png',animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:process.env.CAPABILITIES_EVIDENCE+'/mobile.png',animations:'disabled'});}
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');await context.close();
 }finally{releaseCalendar?.();if(pageForCleanup&&!pageForCleanup.isClosed())await pageForCleanup.unrouteAll({behavior:'wait'});await browser.close();}
});
