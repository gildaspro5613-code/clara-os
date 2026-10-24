import assert from 'node:assert/strict';
import {execFile,execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,writeFileSync} from 'node:fs';
import type {BrowserContext,Page} from 'playwright';
import type {TestContext} from 'node:test';
import {seedNativeMailFixture,SimulatedMail} from './native-mail-fixture';
import {nativeMailRouteFixture} from './native-mail-route-fixture';
import {OpenAIResponsesEngine} from '@/lib/connectors/internal/openai/responses/openai-responses-engine';

/** Isolated acceptance extension, using existing services and PostgreSQL.
 * Mail HTTP is fulfilled by the actual handler with provider-only injection;
 * Next.js serves all remaining business pages/routes. No real provider receives a call. */
export async function firstDayBrowser(t:TestContext,page:Page,context:BrowserContext,connectionId:string,out:string){
 const origin=process.env.DOCUMENTS_E2E_ORIGIN!,db=process.env.NATIVE_TEST_DATABASE!;
 assert.equal(new URL(origin).hostname,'127.0.0.1');assert.match(db,/^native_browser_[a-f0-9]{32}$/);
 const pg=(sql:string)=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:'pipe'}).trim();
 seedNativeMailFixture(pg);const provider=new SimulatedMail();
 const query=async(strings:TemplateStringsArray,...values:unknown[])=>{
  const sql=strings.reduce((s,part,i)=>s+part+(i<values.length?"'"+String(values[i]).replaceAll("'","''")+"'":''),'');
  try{const r=await promisify(execFile)('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(r) FROM (${sql})r`]);return r.stdout.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}
  catch(error){throw {code:String((error as {stderr:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]};}
 };
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 const handlers=nativeMailRouteFixture(query,()=>provider);
 t.mock.method(OpenAIResponsesEngine.prototype,'generate',async()=>({success:true,content:JSON.stringify({subject:'J1_BROUILLON_VERIFIE',body:'Brouillon synthétique à relire. Aucune communication effectuée.'}),responseStatus:'completed'}));
 await context.route('**/api/native/mail**',async route=>{
  const r=route.request(),method=r.method() as 'GET'|'POST';
  const response=await handlers[method](new Request(r.url(),{method,headers:await r.allHeaders(),...(method==='POST'?{body:r.postData()!}:{})}));
  await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
 });
 await page.goto(origin+'/');await page.getByText('Résumé de la mission active',{exact:true}).waitFor();
 await page.getByText(/Ce résumé concerne uniquement la mission/).waitFor();
 assert.equal(await page.getByText('Résumé du jour',{exact:true}).count(),0);
 // Agenda uses the same previously authenticated synthetic Google connection.
 // Resource inspection/binding is explicit, through the native UI and its CAS.
 const stateFile='/tmp/native-fixture-google-state-'+db,state=JSON.parse(readFileSync(stateFile,'utf8'));
 const day=new Date().toISOString().slice(0,10);
 state.workspace={calendars:{'calendar-a':{id:'calendar-a',summary:'Calendrier J1 autorisé',etag:'"calendar-a-1"',accessRole:'owner'}},files:{},events:{'calendar-a/j1':{id:'j1',summary:'J1_RENDEZ_VOUS_CONFIRME',etag:'"event-j1"',start:{dateTime:day+'T12:00:00Z'},end:{dateTime:day+'T13:00:00Z'}}},writes:[],generated:0};writeFileSync(stateFile,JSON.stringify(state));
 await page.goto(origin+'/agenda');const agenda=page.getByRole('region',{name:'Agenda autorisé et confirmations',exact:true});
 await agenda.getByLabel('Identifiant explicite du calendrier',{exact:true}).fill('calendar-a');
 await agenda.getByRole('button',{name:'Vérifier la ressource',exact:true}).click();
 await Promise.all([page.waitForEvent('load'),agenda.getByRole('button',{name:'Confirmer le rattachement au projet',exact:true}).click()]);
 await agenda.getByRole('button',{name:'Consulter les événements autorisés',exact:true}).click();await agenda.getByText(/J1_RENDEZ_VOUS_CONFIRME/).waitFor();
 await page.goto(origin+'/messagerie');const panel=page.getByRole('region',{name:'Messagerie professionnelle',exact:true});
 await panel.getByLabel('Boîte email',{exact:true}).selectOption('mail-clara');await panel.getByRole('button',{name:'Dossiers autorisés',exact:true}).click();await panel.getByLabel('Dossier',{exact:true}).selectOption('INBOX');await panel.getByRole('button',{name:'Synchroniser',exact:true}).click();
 await panel.getByRole('button',{name:/correspondent@example.invalid/}).click();await panel.getByText(/UNTRUSTED_MAIL/).waitFor();
 await Promise.all([page.waitForEvent('load'),panel.getByRole('button',{name:'Rattacher au contact et à la mission',exact:true}).click()]);
 const open=async()=>{await panel.getByLabel('Boîte email',{exact:true}).selectOption('mail-clara');await panel.getByRole('button',{name:'Actualiser',exact:true}).click();await panel.getByRole('button',{name:/correspondent@example.invalid/}).click();await panel.getByText(/UNTRUSTED_MAIL/).waitFor();};await open();
 await panel.getByRole('button',{name:'Préparer une réponse avec Clara',exact:true}).click();await panel.getByLabel('Objet',{exact:true}).waitFor();assert.equal(await panel.getByLabel('Objet',{exact:true}).inputValue(),'J1_BROUILLON_VERIFIE');
 await panel.getByRole('button',{name:'Soumettre le brouillon enregistré',exact:true}).click();await panel.getByRole('button',{name:'Relire le contenu figé',exact:true}).click();await panel.getByText('Brouillon synthétique à relire. Aucune communication effectuée.',{exact:true}).waitFor();
 assert.equal(provider.sent.length,0);
 await page.goto(origin+'/');await page.getByRole('list',{name:'Opérations de courrier enregistrées'}).first().getByRole('link',{name:'À approuver',exact:true}).waitFor();
 await page.getByRole('link',{name:'À approuver',exact:true}).first().click();await page.waitForURL(origin+'/messagerie');await open();await panel.getByRole('button',{name:'Relire le contenu figé',exact:true}).click();
 await panel.getByRole('button',{name:'Approuver en tant que propriétaire',exact:true}).click();await panel.getByRole('button',{name:'Envoyer le message approuvé',exact:true}).waitFor();assert.equal(provider.sent.length,0);
 await page.goto(origin+'/');await page.getByRole('link',{name:'Approuvé',exact:true}).first().waitFor();assert.equal(await page.getByText('Transmission SMTP acceptée',{exact:false}).count(),0);await page.getByText('J1_RENDEZ_VOUS_CONFIRME',{exact:true}).first().waitFor();
 const before=pg("SELECT count(*) FROM clara_native_mail_operations");await page.reload();await page.getByRole('link',{name:'Approuvé',exact:true}).first().waitFor();assert.equal(pg("SELECT count(*) FROM clara_native_mail_operations"),before);
 await page.goto(origin+'/journal');await page.getByText('MAIL_APPROVED',{exact:true}).first().waitFor();assert.equal(await page.getByText('MAIL_SEND_SENT',{exact:true}).count(),0);
 await page.goto(origin+'/automatisations');await page.getByRole('status').filter({hasText:/non certifiées/}).waitFor();
 for(const path of ['/api/connections/make/status','/api/connections/brevo']){const r=await page.request.get(origin+path);assert.equal(r.status(),503);assert.equal((await r.json()).code,'NATIVE_SCOPED_OPERATION_UNAVAILABLE');}
 const operations=JSON.parse(pg("SELECT jsonb_agg(jsonb_build_object('state',state,'missionId',mission_id)) FROM clara_native_mail_operations"));assert.ok(operations.every((o:{state:string})=>o.state==='approved'));
 assert.equal(provider.sent.length,0);assert.equal(JSON.parse(readFileSync(stateFile,'utf8')).workspace.writes.length,0);
 writeFileSync(out+'/first-day-result.json',JSON.stringify({status:'PASS',mailHandler:'actual route with provider injection; SQL real',googleProvider:'simulated HTTP boundary',sameContextConnection:connectionId,missionContactDocumentsBrain:true,recordedApprovalVisible:true,approvalIsNotExecution:true,agendaRead:true,refresh:true,journal:true,makeBrevoFenced:true,smtpAttempts:0,googleWrites:0,semanticProviderCertified:false},null,2));
}
