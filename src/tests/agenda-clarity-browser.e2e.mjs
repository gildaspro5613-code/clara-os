import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash,X509Certificate} from 'node:crypto';
import {chromium} from 'playwright';
import {seedGoogleWork} from './helpers/native-google-work-fixture.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE,out=process.env.AGENDA_PRESENTATION_EVIDENCE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Isolated HTTPS/PostgreSQL fixture only');
const pg=s=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:'pipe'}).trim();
const file='/tmp/native-fixture-google-state-'+db,change=fn=>{const state=JSON.parse(readFileSync(file,'utf8'));fn(state);writeFileSync(file,JSON.stringify(state));};
let browser,selected,none,missing;const errors=[],writes=[],results=[];
const messages=locale=>JSON.parse(readFileSync('src/i18n/messages/'+locale+'/index.json','utf8'));
const cookie=scope=>'clara_auth_session='+'A'.repeat(43)+'; clara_native_selection='+encodeURIComponent(JSON.stringify(scope));
const call=(scope,path,body)=>fetch(origin+path,{method:body?'POST':'GET',headers:{cookie:cookie(scope),origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
async function context(scope,locale='fr',viewport={width:1440,height:1000},token='A'){
 const c=await browser.newContext({viewport,timezoneId:'America/Los_Angeles'});await c.addCookies([{name:'NEXT_LOCALE',value:locale,url:origin},{name:'clara_native_selection',value:encodeURIComponent(JSON.stringify(scope)),url:origin},...(token?[{name:'clara_auth_session',value:token.repeat(43),url:origin}]:[])]);
 await c.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(/hydration|didn.t match/i.test(m.text()))errors.push(m.text());});p.on('request',r=>{if(!['GET','HEAD'].includes(r.method())&&new URL(r.url()).pathname.startsWith('/api/'))writes.push(new URL(r.url()).pathname);});
 await p.clock.setFixedTime(new Date('2026-11-03T12:00:00Z'));return {c,p};
}
before(async()=>{
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');seedGoogleWork(pg);
 change(s=>{s.workspace={calendars:{'calendar-a':{id:'calendar-a',summary:'Agenda de travail autorisé',accessRole:'owner',etag:'"a1"'}},files:{},events:{
 'calendar-a/meeting':{id:'meeting',summary:'Réunion de préparation',location:'Angers',description:'Échange préparatoire autorisé.',start:{dateTime:'2026-11-03T09:00:00Z'},end:{dateTime:'2026-11-03T10:00:00Z'}},
 'calendar-a/overlap':{id:'overlap',summary:'Point de coordination',start:{dateTime:'2026-11-03T09:30:00Z'},end:{dateTime:'2026-11-03T10:30:00Z'}},
 'calendar-a/all':{id:'all',summary:'Journée de préparation',start:{date:'2026-11-03'},end:{date:'2026-11-04'}},
 'calendar-a/multi':{id:'multi',summary:'Préparation sur plusieurs jours',start:{dateTime:'2026-11-02T21:00:00Z'},end:{dateTime:'2026-11-04T01:00:00Z'}}},writes:[],generated:0};});
 const create=async()=>{const response=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:'clara_auth_session='+'A'.repeat(43),origin,'Content-Type':'application/json'},body:JSON.stringify({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'})});assert.equal(response.status,200);return(await response.json()).data;};
 [selected,none,missing]=await Promise.all([create(),create(),create()]);
 assert.equal((await call(selected,'/api/native/runtime',{action:'createMission',title:'Consulter les rendez-vous',objective:'Lire les événements autorisés.'})).status,200);
 for(const scope of [selected,missing])assert.equal((await call(scope,'/api/connections/google',{action:'select',connectionId:'google-work-a'})).status,200);
 const inspect=await call(selected,'/api/native/google/work',{action:'inspect',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a'});assert.equal(inspect.status,200);
 assert.equal((await call(selected,'/api/native/google/work',{action:'bind',connectionId:'google-work-a',kind:'calendar',resourceId:'calendar-a',version:(await inspect.json()).resource.version})).status,200);
 browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64')]});if(out)mkdirSync(out,{recursive:true});
});
after(async()=>{await browser?.close();assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.equal(JSON.parse(readFileSync(file,'utf8')).workspace.writes.length,0);assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');if(out)writeFileSync(out+'/after-results.json',JSON.stringify({results,providerCertified:false,automaticWrites:0,hydrationErrors:0},null,2)+'\n');});
for(const locale of ['fr','en','es','de','it'])test('Calendar views '+locale+': desktop/tablet/mobile, native reads, no technical controls',{timeout:120000},async()=>{
 for(const [device,width,height]of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]]){
  const {c,p}=await context(selected,locale,{width,height}),t=messages(locale).agendaCalendar;await p.goto(origin+'/agenda');await p.locator('.agenda-calendar-source').getByText('Agenda de travail autorisé',{exact:true}).waitFor();
  for(const view of ['week','day','month']){
   if(view!=='week'){const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/calendar');await p.getByRole('button',{name:t[view],exact:true}).click();await (await response).finished();}
   await p.waitForFunction(()=>document.querySelector('[data-agenda-events]')?.getAttribute('aria-busy')==='false');
   await p.locator('.agenda-event').first().waitFor();assert.equal(await p.locator('[data-agenda-view]').getAttribute('data-agenda-view'),view);
   assert.equal(await p.locator('[data-agenda-view]').locator('details,select,input,textarea,#native-google-document-authority').count(),0);
   assert.ok(await p.locator('#main-workspace').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   assert.equal(await p.getByRole('link',{name:messages(locale).agendaPage.talkToClara,exact:true}).getAttribute('href'),'/clara');
   if(view==='week')assert.equal(await p.locator('[data-calendar-day]').count(),7);
   if(view==='month')assert.equal(await p.locator('[data-calendar-day]').count(),42);
   if(out)await p.screenshot({path:out+'/after-'+locale+'-'+device+'-'+view+'.png'});
   results.push({locale,device,view,result:'PASS'});
  }
  await c.close();
 }
});
test('Calendar details, navigation, full-day exclusion, overlap and explicit pagination',{timeout:120000},async()=>{
 const {c,p}=await context(selected),t=messages('fr').agendaCalendar;
 await p.goto(origin+'/agenda');await p.locator('.agenda-event').first().waitFor();
 await p.getByRole('button',{name:t.day,exact:true}).click();const meeting=p.locator('[data-agenda-event="meeting"]');await meeting.click();
 const dialog=p.getByRole('dialog',{name:t.details,exact:true});await dialog.getByText('Angers',{exact:true}).waitFor();await dialog.getByText('Échange préparatoire autorisé.',{exact:true}).waitFor();
 if(out){await p.screenshot({path:out+'/after-details-desktop.png'});await p.setViewportSize({width:390,height:844});await p.screenshot({path:out+'/after-details-mobile.png'});await p.setViewportSize({width:1440,height:1000});}
 await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await meeting.evaluate(e=>document.activeElement===e),true);
 await p.locator('[data-agenda-event="all"]').click();await dialog.getByText('Mardi 3 novembre 2026',{exact:true}).first().waitFor();assert.ok(!(await dialog.innerText()).includes('Mercredi 4 novembre'));await dialog.getByRole('button',{name:t.close,exact:true}).click();
 const previous=p.waitForRequest(r=>new URL(r.url()).pathname==='/api/calendar');await p.getByRole('button',{name:t.previous,exact:true}).click();assert.equal(new URL((await previous).url()).searchParams.get('timeMin'),'2026-11-01T23:00:00.000Z');
 await p.getByRole('button',{name:t.today,exact:true}).click();await p.locator('[data-agenda-event="meeting"]').waitFor();
 await p.getByRole('button',{name:t.month,exact:true}).click();await p.locator('[data-calendar-day="2026-11-03"] .agenda-extra').click();assert.equal(await p.locator('[data-agenda-view]').getAttribute('data-agenda-view'),'day');await p.locator('[data-agenda-event="all"]').waitFor();
 const next=p.waitForRequest(r=>new URL(r.url()).pathname==='/api/calendar');await p.getByRole('button',{name:t.next,exact:true}).click();assert.equal(new URL((await next).url()).searchParams.get('timeMin'),'2026-11-03T23:00:00.000Z');await p.locator('[data-agenda-event="multi"]').waitFor();assert.equal(await p.locator('[data-agenda-event="all"]').count(),0);
 change(s=>{s.workspace.eventPageSize=2;});await p.getByRole('button',{name:t.today,exact:true}).click();await p.getByRole('button',{name:t.loadMore,exact:true}).click();await p.waitForFunction(()=>!document.querySelector('.agenda-pagination button:disabled'));await p.locator('[data-agenda-event="meeting"]').waitFor();assert.equal(await p.locator('.agenda-event').count(),4);assert.equal(await p.getByRole('button',{name:t.loadMore,exact:true}).count(),0);
 await c.close();change(s=>{delete s.workspace.eventPageSize;});
});
test('Native Calendar connection/refusal/consent/expired states never imply an empty calendar',{timeout:120000},async()=>{
 const scopes=pg("SELECT scopes::text FROM clara_connections WHERE id='google-work-a'");
 for(const [name,scope,key]of [['none',none,'agendaConnectionRequired'],['calendar',missing,'agendaCalendarRequired'],['reconnect',selected,'agendaReconnectRequired'],['denied',selected,'agendaAccessDenied'],['unavailable',selected,'agendaTemporarilyUnavailable'],['consent',selected,'agendaConsentRequired'],['empty',selected,null]]){
  pg("UPDATE clara_connections SET status='"+(name==='reconnect'?'RECONNECT_REQUIRED':'ACTIVE')+"',scopes='"+(name==='consent'?'[]':scopes).replaceAll("'","''")+"'::jsonb WHERE id='google-work-a'");change(s=>{s.workspace.unavailable=name==='unavailable';s.workspace.calendars['calendar-a'].accessRole=name==='denied'?'freeBusyReader':'owner';if(name==='empty')s.workspace.events={};});
  const {c,p}=await context(scope);await p.goto(origin+'/agenda');
  if(key){await p.locator('[data-agenda-read-state="'+key+'"]').waitFor();assert.equal(await p.getByText(messages('fr').agendaCalendar.empty,{exact:true}).count(),0);}else await p.getByText(messages('fr').agendaCalendar.empty,{exact:true}).waitFor();
  assert.equal(await p.locator('[data-agenda-view]').locator('details,select,input').count(),0);if(out)await p.screenshot({path:out+'/after-state-'+name+'.png'});await c.close();
 }
 for(const token of ['', 'D']){const {c,p}=await context(selected,'fr',{width:390,height:844},token);await p.goto(origin+'/agenda');await p.locator('[data-agenda-read-state="'+(token?'agendaAccessDenied':'agendaSessionExpired')+'"]').waitFor();assert.equal(await p.locator('.agenda-event').count(),0);await c.close();}
});
