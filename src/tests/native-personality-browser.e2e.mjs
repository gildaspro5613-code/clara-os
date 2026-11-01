import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash,X509Certificate} from 'node:crypto';
import {verifiedGoogleDisplayCookie} from '../lib/auth/google-display-name.ts';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Disposable HTTPS fixture only');
const pg=sql=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:'pipe'}).trim();
const fixture='/tmp/native-fixture-google-state-'+db,proof='/tmp/native-fixture-personality-'+db;
const setCase=(locale,kind)=>{const state=JSON.parse(readFileSync(fixture,'utf8'));state.personalityReceipt={locale,kind};writeFileSync(fixture,JSON.stringify(state));};
test('personality reaches actual GPT HTTP payload and durable written/voice conversations in five locales, verified name only',{timeout:180000},async()=>{
 process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
 const display=verifiedGoogleDisplayCookie('A'.repeat(43),'Camille',true);assert.ok(display.value);
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin,'--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const samples=[],before=pg('SELECT count(*) FROM clara_missions');
 try{
  for(const locale of ['fr','en','es','de','it']){
   const response=await fetch(origin+'/api/native/runtime',{method:'POST',headers:{cookie:'clara_auth_session='+'A'.repeat(43),origin,'Content-Type':'application/json'},body:JSON.stringify({action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p1'})});assert.equal(response.status,200);
   const selected=(await response.json()).data,selection=response.headers.get('set-cookie').split(';')[0];
   const context=await browser.newContext({permissions:['microphone'],viewport:{width:1440,height:1000}});
   await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'clara_native_selection',value:selection.slice(selection.indexOf('=')+1),url:origin},{name:'NEXT_LOCALE',value:locale,url:origin},{name:display.name,value:display.value,httpOnly:true,secure:true,url:origin}]);
   await context.addInitScript(()=>{window.recorders=[];const Original=window.MediaRecorder;window.MediaRecorder=class extends Original{constructor(...args){super(...args);window.recorders.push(this);}};window.audios=[];const AudioOriginal=window.Audio;window.Audio=function(...args){const audio=new AudioOriginal(...args);window.audios.push(audio);return audio;};});
   const page=await context.newPage();await page.goto(origin);
   const messages=[['greeting','Bonjour Clara !'],['simple','Préfère des réponses courtes, s’il te plaît. Est-ce que tu peux m’aider ?'],['professional',"Quels points regarder pour préparer une prestation, sans lancer d'action ?"],['resume','Que nous étions-nous dit dans cet échange ?']];
   for(const [kind,input] of messages){
    setCase(locale,kind);if(kind==='resume')await page.reload();
    const form=page.locator('[data-cockpit-widgets] form').last();await form.locator('textarea').fill(input);
    const reply=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'&&r.request().method()==='POST');await form.locator('button[type="submit"]').click();const result=await reply;assert.equal(result.status(),200,await result.text());const body=await result.json();
    assert.equal(kind==='greeting',body.message.includes('Camille'));await page.getByRole('log').getByText(body.message,{exact:true}).waitFor();samples.push({provider:'SIMULATED — scripted HTTP fixture, not GPT',locale,kind,input,output:body.message});
   }
   // Same native route, same identity and instructions, initiated by the existing microphone button.
   setCase(locale,'voice');writeFileSync('/tmp/native-fixture-voice-'+db,JSON.stringify({calls:[],seconds:1}));
   const button=page.locator('[data-cockpit-hero] button[data-native-voice]').filter({visible:true});
   await page.waitForFunction(()=>[...document.querySelectorAll('button[data-native-voice]')].some(b=>b.offsetParent!==null&&!b.disabled));
   await button.click();await page.waitForFunction(()=>window.recorders.some(r=>r.state==='recording'));
   const voice=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'&&r.request().method()==='POST');await button.click();const voiceResult=await voice;assert.equal(voiceResult.status(),200);const spoken=(await voiceResult.json()).message;await page.waitForFunction(()=>window.audios.some(a=>a.currentTime>0));samples.push({provider:'SIMULATED — GPT and ElevenLabs HTTP fixtures',locale,kind:'voice',input:'Présente les missions autorisées, sans modification.',output:spoken});
   const history=await page.request.get(origin+'/api/clara/conversation?thread='+encodeURIComponent(selected.sessionId)+'&limit=100');assert.equal(history.status(),200);const saved=(await history.json()).messages;assert.equal(saved.length,10);assert.equal(saved.at(-1).content,spoken);
   // A persisted/old name must not become authenticated identity after its display proof disappears.
   await context.clearCookies({name:display.name});setCase(locale,'greeting');await page.reload();const form=page.locator('[data-cockpit-widgets] form').last();await form.locator('textarea').fill('Bonjour à nouveau.');const noName=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat'&&r.request().method()==='POST');await form.locator('button[type="submit"]').click();const nameless=await noName;assert.equal(nameless.status(),200);assert.ok(!(await nameless.json()).message.includes('Camille'));await context.close();
  }
  const evidence=readFileSync(proof,'utf8').trim().split('\n').map(JSON.parse);assert.equal(evidence.length,30);assert.equal(evidence.filter(p=>p.authenticatedName).length,25);assert.equal(evidence.filter(p=>p.unknownName).length,5);assert.ok(evidence.every(p=>p.personality&&!p.tools));assert.ok(evidence.filter(p=>['resume','voice'].includes(p.kind)).every(p=>p.priorPreference));
  assert.equal(pg('SELECT count(*) FROM clara_missions'),before,'Personality receipt must never create a mission');assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');
  if(process.env.PERSONALITY_EVIDENCE){mkdirSync(process.env.PERSONALITY_EVIDENCE,{recursive:true});writeFileSync(process.env.PERSONALITY_EVIDENCE+'/examples-simulated.json',JSON.stringify(samples,null,2));writeFileSync(process.env.PERSONALITY_EVIDENCE+'/payload-attestation.json',JSON.stringify(evidence,null,2));}
 }finally{const state=JSON.parse(readFileSync(fixture,'utf8'));delete state.personalityReceipt;writeFileSync(fixture,JSON.stringify(state));await browser.close();}
});
