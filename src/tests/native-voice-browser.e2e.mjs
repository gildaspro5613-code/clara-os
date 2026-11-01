import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash,X509Certificate} from 'node:crypto';
const origin=process.env.DOCUMENTS_E2E_ORIGIN,db=process.env.NATIVE_TEST_DATABASE;
if(!origin||new URL(origin).hostname!=='127.0.0.1'||!/^native_browser_[a-f0-9]{32}$/.test(db??''))throw Error('Disposable HTTPS fixture only');
const pg=sql=>execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8',stdio:'pipe'}).trim();
const file='/tmp/native-fixture-voice-'+db;
const state=()=>JSON.parse(readFileSync(file,'utf8'));
const setState=patch=>writeFileSync(file,JSON.stringify({...state(),...patch}));
const auth='clara_auth_session='+'A'.repeat(43);
const call=(cookie,path,body)=>fetch(origin+path,{method:body?'POST':'GET',headers:{cookie,...(body?{origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
test('Hero native voice: actual microphone recorder, STT/chat/history/TTS, replay and SQL revocation stop recording/provider/audio',{timeout:150000},async()=>{
 writeFileSync(file,JSON.stringify({calls:[],seconds:30}));
 const created=await call(auth,'/api/native/runtime',{action:'createSession',workspaceId:'w',clientId:'c1',projectId:'p2'});assert.equal(created.status,200);
 const scope=(await created.json()).data,selection=created.headers.get('set-cookie').split(';')[0],cookie=auth+'; '+selection;
 assert.equal((await call(cookie,'/api/native/runtime',{action:'createMission',title:'Préparer la journée avec Clara',objective:'Retrouver les missions autorisées.'})).status,200);
 const query='?'+new URLSearchParams(scope);
 assert.equal((await call(cookie,'/api/voice/transcribe'+query)).status,200);
 assert.equal((await call(cookie.replace('A'.repeat(43),'B'.repeat(43)),'/api/voice/transcribe'+query)).status,403);
 assert.equal((await call('', '/api/voice/transcribe'+query)).status,401);
 assert.equal((await call(cookie,'/api/voice/transcribe?'+new URLSearchParams({...scope,projectId:'p1'}))).status,403);
 assert.equal((await call(cookie,'/api/voice/speak'+query,{text:'Must not synthesize arbitrary browser text'})).status,400);
 assert.equal((await call(cookie,'/api/voice/speak'+query,{messageId:'foreign-message'})).status,403);
 assert.equal((await fetch(origin+'/api/voice/transcribe'+query,{method:'POST',headers:{cookie,origin:'https://foreign.invalid'}})).status,403);
 assert.equal((await call(cookie,'/api/elevenlabs/session')).status,403,'No native fallback to autonomous SDK');
 const pin=createHash('sha256').update(new X509Certificate(readFileSync('/tmp/native-runtime-cert.pem')).publicKey.export({type:'spki',format:'der'})).digest('base64');
 const browser=await chromium.launch({executablePath:process.env.DOCUMENTS_E2E_CHROMIUM,headless:true,args:['--no-sandbox','--ignore-certificate-errors-spki-list='+pin,'--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 try{
  const context=await browser.newContext({permissions:['microphone'],viewport:{width:1536,height:1000}});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.addCookies([{name:'clara_auth_session',value:'A'.repeat(43),url:origin},{name:'clara_native_selection',value:selection.slice(selection.indexOf('=')+1),url:origin},{name:'NEXT_LOCALE',value:'fr',url:origin}]);
  await context.addInitScript(()=>{
   window.voiceStreams=[];window.voiceAudios=[];window.voiceRecorders=[];const OriginalRecorder=window.MediaRecorder;window.MediaRecorder=class extends OriginalRecorder{constructor(...args){super(...args);window.voiceRecorders.push(this);}};window.voicePlayback={plays:0,pauses:0};
   const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async o=>{const stream=await get(o);window.voiceStreams.push(stream);return stream;};
   const Original=window.Audio;window.Audio=function(...args){const audio=new Original(...args);window.voiceAudios.push(audio);const play=audio.play.bind(audio),pause=audio.pause.bind(audio);audio.play=()=>{window.voicePlayback.plays++;return play();};audio.pause=()=>{window.voicePlayback.pauses++;return pause();};return audio;};
  });
  const page=await context.newPage();const requests=[],spoken=[],receipts=new Set();page.on('request',r=>{requests.push(r.url());if(new URL(r.url()).pathname==='/api/voice/speak')spoken.push(r.postDataJSON().messageId);});page.on('response',async r=>{if(new URL(r.url()).pathname==='/api/clara/chat'&&r.status()===200){const data=await r.json();receipts.add(data.conversation.filter(m=>m.role==='clara').at(-1).id);}});
  const button=()=>page.locator('[data-cockpit-hero] button[data-native-voice]').filter({visible:true});
  const ready=async()=>{await page.goto(origin);await button().waitFor();await page.waitForFunction(()=>{return [...document.querySelectorAll('button[data-native-voice]')].some(b=>b.offsetParent!==null&&!b.disabled);});};
  const record=async()=>{await button().click();await page.waitForFunction(()=>window.voiceRecorders.length&&window.voiceRecorders.at(-1).state==='recording');};
  const stopRecording=()=>button().click();
  const history=async()=>{const response=await call(cookie,'/api/clara/conversation'+query+'&thread='+scope.sessionId+'&limit=100');assert.equal(response.status,200);return (await response.json()).messages;};
  const countMissions=()=>pg('SELECT count(*) FROM clara_missions');const before=countMissions();
  await ready();await record();await stopRecording();
  await page.waitForFunction(()=>window.voicePlayback.plays===1&&window.voiceAudios.some(a=>!a.paused&&!a.ended&&a.currentTime>0));await page.getByRole('log').getByText('Isolated Clara response',{exact:true}).waitFor();
  const first=await history();assert.equal(first.length,2);assert.equal(first[0].role,'user');assert.equal(first[1].role,'clara');assert.equal(countMissions(),before);assert.equal((await call(cookie,'/api/voice/speak'+query,{messageId:first[0].id})).status,403);
  await button().click();await page.waitForFunction(()=>window.voicePlayback.pauses>=1); // Explicit interruption.
  await ready();await page.getByRole('log').getByText('Isolated Clara response',{exact:true}).waitFor();assert.deepEqual(await history(),first);
  // Lost response after actual SQL commit: reload and reuse the SAME durable chat operation.
  let drop=true;
  await page.route('**/api/clara/chat?**',async route=>{if(drop){drop=false;await route.fetch();await route.abort();}else await route.continue();});
  await record();await stopRecording();await button().getByText(JSON.parse(readFileSync('src/i18n/messages/fr/index.json','utf8')).voice.retry,{exact:true}).waitFor();
  assert.equal((await history()).length,4);const sttBefore=state().calls.filter(p=>p.endsWith('speech-to-text')).length;
  await ready();const replay=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clara/chat');await button().click();assert.equal((await replay).headers()['x-clara-operation-replayed'],'1');await page.waitForFunction(()=>window.voicePlayback.plays===1&&window.voiceAudios.some(a=>!a.paused&&!a.ended&&a.currentTime>0));
  assert.equal((await history()).length,4);assert.equal(state().calls.filter(p=>p.endsWith('speech-to-text')).length,sttBefore);await button().click();await page.unroute('**/api/clara/chat?**');
  // Revoke the existing project permission while recording: physical browser tracks end.
  await ready();await record();const calls=state().calls.length;
  pg("UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE workspace_id='w' AND project_id='p2' AND user_id='a'");
  await page.waitForFunction(()=>window.voiceStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));assert.equal(state().calls.length,calls);assert.equal(await button().isDisabled(),true);
  pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE workspace_id='w' AND project_id='p2' AND user_id='a'");
  // Revoke while a provider HTTP request is in flight: AbortSignal cancels it; no chat.
  setState({delayMs:10000});await ready();await record();await stopRecording();
  await page.waitForResponse(r=>new URL(r.url()).pathname==='/api/voice/transcribe'&&r.request().method()==='GET');
  for(let i=0;i<100&&state().calls.length===calls;i++)await new Promise(r=>setTimeout(r,50));assert.ok(state().calls.length>calls);
  pg("UPDATE clara_registry_project_access SET revoked_at=NOW() WHERE workspace_id='w' AND project_id='p2' AND user_id='a'");
  for(let i=0;i<100&&!state().aborted;i++)await new Promise(r=>setTimeout(r,50));assert.ok(state().aborted>=1,'Server provider request aborted');
  pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE workspace_id='w' AND project_id='p2' AND user_id='a'");setState({delayMs:0});assert.equal((await history()).length,4);
  // Revoked authenticated session during playback: audio is actually paused and src cleared.
  await ready();await record();await stopRecording();await page.waitForFunction(()=>window.voicePlayback.plays===1&&window.voiceAudios.some(a=>!a.paused&&!a.ended&&a.currentTime>0));
  const digest=createHash('sha256').update('A'.repeat(43)).digest('hex');
  pg(`UPDATE clara_auth_sessions SET revoked_at=NOW() WHERE token_hash='${digest}'`);
  await page.waitForFunction(()=>window.voicePlayback.pauses>=1&&window.voiceAudios.every(a=>a.paused&&!a.getAttribute('src')));assert.equal(await button().isDisabled(),true);
  assert.equal((await call(cookie,'/api/voice/transcribe'+query)).status,403);
  pg(`UPDATE clara_auth_sessions SET revoked_at=NULL WHERE token_hash='${digest}'`);
  assert.equal((await history()).length,6);assert.equal(countMissions(),before);
  if(process.env.VOICE_VISUAL_DIR){mkdirSync(process.env.VOICE_VISUAL_DIR,{recursive:true});await ready();await page.screenshot({path:process.env.VOICE_VISUAL_DIR+'/desktop.png',animations:'disabled'});await page.setViewportSize({width:390,height:844});await ready();await record();await stopRecording();await page.waitForFunction(()=>window.voicePlayback.plays===1&&window.voiceAudios.some(a=>!a.paused&&!a.ended&&a.currentTime>0));assert.equal((await history()).length,8);await button().click();await page.screenshot({path:process.env.VOICE_VISUAL_DIR+'/mobile.png',animations:'disabled'});}
  assert.ok(spoken.length>=3);for(const id of spoken)assert.ok(receipts.has(id),'Synthesized reply belongs to its committed chat receipt');
  assert.ok(!requests.some(url=>url.includes('/api/elevenlabs/session')||url.includes('api.elevenlabs.io')));assert.equal(readFileSync('/tmp/native-fixture-global-attempts-'+db,'utf8'),'');await context.close();
 }finally{await browser.close();pg("UPDATE clara_registry_project_access SET revoked_at=NULL WHERE workspace_id='w' AND project_id='p2' AND user_id='a'");pg("UPDATE clara_auth_sessions SET revoked_at=NULL WHERE user_id='a'");}
});
