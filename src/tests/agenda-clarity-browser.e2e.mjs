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
test('Agenda clarity: existing native selection, periods, honest errors and responsive five-language UI',{timeout:180000},async()=>{
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
  const before=process.env.AGENDA_CLARITY_BEFORE==='1';
  const capture=async(p,name)=>{if(out)await p.screenshot({path:out+'/'+(before?'before':'after')+'-'+name+'.png'});};
  for(const locale of ['fr','en','es','de','it'])for(const [device,width,height]of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]]){
   const {c,p}=await context(selected,locale,{width,height});await p.clock.setFixedTime(new Date('2026-11-03T12:00:00Z'));
   await p.goto(origin+'/agenda');await p.getByText('Réunion de préparation',{exact:true}).waitFor();
   assert.equal(await p.locator('[data-agenda-settings]').evaluate(e=>e.open),false);
   assert.equal(await p.locator('#native-google-document-authority').count(),0);
   assert.ok(await p.locator('#main-workspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   if(!before){
    const dictionary=dictionaries(locale).agendaPage;
    await p.getByText(dictionary.calendarUsed.replace('{name}','Agenda de travail autorisé'),{exact:true}).waitFor();
    assert.equal(await p.getByRole('link',{name:dictionary.talkToClara,exact:true}).getAttribute('href'),'/clara');
    assert.equal(await p.locator('[data-agenda-selection] select').count(),0,'Selected calendar hides unnecessary controls');
    for(const label of [dictionary.today,dictionary.week,dictionary.upcoming])await p.getByRole('button',{name:label,exact:true}).waitFor();
    if(locale==='fr'&&device==='desktop'){
    const week=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/calendar');await p.getByRole('button',{name:dictionary.week,exact:true}).click();assert.equal((await week).status(),200);await p.getByText('Réunion de préparation',{exact:true}).waitFor();
    const upcoming=p.waitForRequest(r=>new URL(r.url()).pathname==='/api/calendar');await p.getByRole('button',{name:dictionary.upcoming,exact:true}).click();const query=new URL((await upcoming).url()).searchParams;assert.equal(query.get('timeMax'),'2026-12-02T23:00:00.000Z');
    await p.getByRole('button',{name:dictionary.today,exact:true}).click();await p.getByText('Réunion de préparation',{exact:true}).waitFor();
    }
   }
   await capture(p,locale+'-'+device);
   if(locale==='fr'){
    await p.locator('[data-agenda-events]').scrollIntoViewIfNeeded();await capture(p,'events-'+device);
    await revealAgendaSettings(p);await p.locator('#native-agenda-writes').waitFor();
    assert.equal(await p.getByRole('button',{name:'Confirmer et exécuter une seule fois',exact:true}).count(),0);
    await capture(p,'advanced-'+device);
   }
   await c.close();results.push({locale,device,result:'PASS'});
  }
  assert.deepEqual(autoWrites,[],'Viewing periods/settings never initiates OAuth or writes');
  if(!before){
   // Select the existing account and already authorized calendar using actual native POSTs.
   const {c,p}=await context(none);await p.clock.setFixedTime(new Date('2026-11-03T12:00:00Z'));await p.goto(origin+'/agenda');
   const panel=p.locator('[data-agenda-selection]');await panel.getByLabel('Compte Google',{exact:true}).waitFor();
   assert.equal(await panel.getByRole('button',{name:'Utiliser ce compte',exact:true}).isDisabled(),true);
   await panel.getByLabel('Compte Google',{exact:true}).selectOption('google-work-a');
   await panel.getByRole('button',{name:'Utiliser ce compte',exact:true}).click();
   await panel.getByLabel('Calendrier',{exact:true}).selectOption('calendar-a');await panel.getByRole('button',{name:'Utiliser ce calendrier',exact:true}).click();
   await p.getByText('Réunion de préparation',{exact:true}).waitFor();await p.reload();await panel.getByText('Clara utilise : Agenda de travail autorisé',{exact:true}).waitFor();
   assert.deepEqual(autoWrites.sort(),['/api/connections/google','/api/native/google/work'].sort());await c.close();
   const cases=[['calendar-missing',calendarMissing,'agendaCalendarRequired'],['reconnect',selected,'agendaReconnectRequired'],['denied',selected,'agendaAccessDenied'],['unavailable',selected,'agendaTemporarilyUnavailable'],['consent',selected,'agendaConsentRequired'],['empty',selected,null]];
   const originalScopes=pg("SELECT scopes::text FROM clara_connections WHERE id='google-work-a'");
   for(const [name,scope,key] of cases){
    pg("UPDATE clara_connections SET status='"+(name==='reconnect'?'RECONNECT_REQUIRED':'ACTIVE')+"',scopes='"+(name==='consent'?'[]':originalScopes).replaceAll("'","''")+"'::jsonb WHERE id='google-work-a'");
    change(s=>{s.workspace.unavailable=name==='unavailable';s.workspace.calendars['calendar-a'].accessRole=name==='denied'?'freeBusyReader':'owner';if(name==='empty')s.workspace.events={};});
    const {c,p}=await context(scope);await p.clock.setFixedTime(new Date('2026-11-03T12:00:00Z'));await p.goto(origin+'/agenda');const area=p.locator('[data-agenda-events]');
    if(key){await area.locator('[data-agenda-read-state="'+key+'"]').waitFor();assert.equal(await area.getByText(dictionaries('fr').agendaPage.empty,{exact:true}).count(),0);}
    else await area.getByText(dictionaries('fr').agendaPage.empty,{exact:true}).waitFor();
    await capture(p,'state-'+name);await c.close();
   }
   {const {c,p}=await context(selected,'fr',{width:390,height:844},false);await p.goto(origin+'/agenda');await p.locator('[data-agenda-read-state="agendaSessionExpired"]').waitFor();await capture(p,'state-sign-in');await c.close();}
   {const {c,p}=await context(selected,'fr',{width:390,height:844},false);
    await c.addCookies([{name:'clara_auth_session',value:'D'.repeat(43),url:origin}]);
    await p.goto(origin+'/agenda');await p.locator('[data-agenda-read-state="agendaAccessDenied"]').waitFor();
    assert.equal(await p.getByText('Réunion de préparation',{exact:true}).count(),0);
    assert.equal(await p.getByRole('button',{name:'Utiliser ce compte',exact:true}).isEnabled(),false);
    await c.close();
   }

  }
  assert.deepEqual(hydration,[]);assert.equal(JSON.parse(readFileSync(stateFile,'utf8')).workspace.writes.length,0);
  assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
  if(out)writeFileSync(out+'/'+(before?'before':'after')+'-results.json',JSON.stringify({providerCertified:false,results,hydrationErrors:0,automaticMutations:0},null,2)+'\n');
 }finally{await browser.close();}
});
