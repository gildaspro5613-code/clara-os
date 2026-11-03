import {nativeDocumentCognitionFixture} from './native-document-cognition-fixture.mjs';
import {googleWorkHttp} from './native-google-work-http-fixture.mjs';
import {generateKeyPairSync,sign} from 'node:crypto';
import {appendFileSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const syntheticKey=generateKeyPairSync('rsa',{modulusLength:2048});
const publicJwk={...syntheticKey.publicKey.export({format:'jwk'}),kid:'isolated-google-key',use:'sig'};
const googleProofFile='/tmp/native-fixture-google-prompts-'+process.env.NATIVE_TEST_DATABASE;writeFileSync(googleProofFile,'');
const database='postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic';
if(process.env.DATABASE_URL!==database||process.env.POSTGRES_URL||!/^native_browser_[a-f0-9]{32}$/.test(process.env.NATIVE_TEST_DATABASE??'')||process.env.OPENAI_API_KEY!=='synthetic-test-only')throw Error('Exact isolated runtime fixture required');
const scopeProofFile='/tmp/native-fixture-commercial-prompt-'+process.env.NATIVE_TEST_DATABASE;writeFileSync(scopeProofFile,'');
const attemptsFile='/tmp/native-fixture-global-attempts-'+process.env.NATIVE_TEST_DATABASE;writeFileSync(attemptsFile,'');
const literal=v=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(url.hostname==='api.invalid'){
  const body=JSON.parse(String(init?.body));
  const normalized=body.query.replace(/\s+/g,' ').trim();
  const voiceDelay='/tmp/native-fixture-voice-delay-'+process.env.NATIVE_TEST_DATABASE;
  if(body.query.startsWith('SELECT clara_native_runtime_command')&&body.params[5]==='write'&&existsSync(voiceDelay)){const delay=JSON.parse(readFileSync(voiceDelay,'utf8')).delayMs;if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));}
  const logout=normalized==='UPDATE clara_auth_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL';
  // Existing canonical authentication reads for account display only.
  const accountIdentity=/^SELECT user_id FROM clara_auth_sessions WHERE token_hash = \$1 AND revoked_at IS NULL AND expires_at > NOW\(\) LIMIT 1$/.test(normalized);
  const accountMembership=/^SELECT workspace_id, role FROM clara_workspace_memberships WHERE user_id = \$1 AND workspace_id = \$2 AND revoked_at IS NULL$/.test(normalized);
  const accountGoogle=normalized.startsWith("SELECT EXISTS(SELECT 1 FROM clara_auth_identities i WHERE i.user_id=s.user_id AND i.issuer='https://accounts.google.com') AS google_linked FROM clara_auth_sessions s JOIN clara_workspace_memberships m ON m.user_id=s.user_id WHERE s.token_hash=$1 AND s.user_id=$2")&&normalized.endsWith('AND m.workspace_id=$3 AND m.revoked_at IS NULL AND EXISTS(SELECT 1 FROM clara_auth_identities verified WHERE verified.user_id=s.user_id) LIMIT 1');
  const missionFinalize=body.query.trimStart().startsWith('WITH native_mission_finalize_input AS MATERIALIZED')&&body.query.includes('FOR SHARE OF authority, mission');
  if(!logout&&!missionFinalize&&!accountIdentity&&!accountMembership&&!accountGoogle&&!/^SELECT clara_(native_|registry_)/.test(body.query)&&!/^SELECT m.workspace_id FROM clara_auth_sessions s JOIN clara_workspace_memberships/.test(body.query)){appendFileSync(attemptsFile,'GLOBAL_LOADER_ATTEMPT\n');throw Error('Global SQL loader forbidden in native browser fixture');}
  const statement=body.query.replace(/\$(\d+)/g,(_,n)=>literal(body.params[Number(n)-1]));
  try{
   if(logout){execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',process.env.NATIVE_TEST_DATABASE,'-q','-v','ON_ERROR_STOP=1','-c',statement],{stdio:['pipe','pipe','pipe']});return Response.json({fields:[],rows:[],rowCount:1,command:'UPDATE',rowAsArray:true});}
   const output=execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',process.env.NATIVE_TEST_DATABASE,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(r) FROM (${statement})r`],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
   const rows=output.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)),names=Object.keys(rows[0]??{});
   return Response.json({fields:names.map(name=>({name,dataTypeID:3802})),rows:rows.map(r=>names.map(n=>JSON.stringify(r[n]))),rowCount:rows.length,command:'SELECT',rowAsArray:true});
  }catch(e){return Response.json({message:/ERROR:\s+42501:\s+NATIVE_GOOGLE_REAUTH_REQUIRED(?:\r?\n|$)/.test(String(e.stderr))?'NATIVE_GOOGLE_REAUTH_REQUIRED':'Isolated authority error',code:String(e.stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]??'XX000'},{status:400});}
 }
 if(['www.googleapis.com','oauth2.googleapis.com','openidconnect.googleapis.com'].includes(url.hostname)){
  const state=JSON.parse(readFileSync('/tmp/native-fixture-google-state-'+process.env.NATIVE_TEST_DATABASE,'utf8'));
  const headers=new Headers(init?.headers),bearer=headers.get('authorization')??'',actor=bearer.includes('synthetic-google-b')?'b':'a';
  if(url.pathname==='/oauth2/v3/certs')return Response.json({keys:[publicJwk]});
  if(url.hostname==='oauth2.googleapis.com'&&url.pathname==='/token'){
   const body=new URLSearchParams(typeof init?.body==='string'?init.body:String(init?.body)),code=body.get('code')??'';
   if(body.get('grant_type')==='refresh_token'){const refresh=body.get('refresh_token');if(!/^synthetic-refresh-google-[ab]$/.test(refresh??''))throw Error('Synthetic refresh only');const sub=refresh.endsWith('-b')?'google-b':'google-a';appendFileSync(googleProofFile,JSON.stringify({phase:'refresh',foreignAbsent:true})+'\n');return Response.json({access_token:'synthetic-'+sub,token_type:'Bearer',expires_in:3600,scope:(state.grantedScopes??['openid','https://www.googleapis.com/auth/drive.readonly']).join(' ')});}
   if(!/^fixture-[ab]\./.test(code))throw Error('Unrecognized synthetic authorization code');
   const [account,nonce]=code.split('.'),sub=account==='fixture-b'?'google-b':'google-a',now=Math.floor(Date.now()/1000);
   const parts=[Buffer.from(JSON.stringify({alg:'RS256',kid:publicJwk.kid})).toString('base64url'),Buffer.from(JSON.stringify({iss:'https://accounts.google.com',sub,aud:'synthetic-google-client',nonce:Buffer.from(nonce,'base64url').toString(),iat:now,exp:now+3600})).toString('base64url')].join('.');
   return Response.json({access_token:'synthetic-'+sub,refresh_token:'synthetic-refresh-'+sub,token_type:'Bearer',expires_in:3600,scope:(state.grantedScopes??['openid','https://www.googleapis.com/auth/drive.readonly']).join(' '),id_token:parts+'.'+sign('RSA-SHA256',Buffer.from(parts),syntheticKey.privateKey).toString('base64url')});
  }
  if(!bearer.startsWith('Bearer synthetic-google-'))throw Error('Synthetic Google bearer required');
  if(url.hostname==='openidconnect.googleapis.com'&&url.pathname==='/v1/userinfo')return Response.json({sub:state.principal??'google-'+actor});
  const workspaceResponse=googleWorkHttp(url,init,state,'/tmp/native-fixture-google-state-'+process.env.NATIVE_TEST_DATABASE,actor);if(workspaceResponse)return workspaceResponse;
  if(url.pathname==='/drive/v3/about')return Response.json({user:{permissionId:'permission-'+actor}});
  const match=url.pathname.match(/^\/drive\/v3\/files\/(document-[a-z0-9-]+)(\/permissions)?$/);
  if(!match)throw Error('No global Drive listing or unrecognized Google operation allowed');
  const fileId=match[1];
  if(!Object.hasOwn(state.versions,fileId)||state.denied.includes(fileId)||actor==='b'&&fileId!=='document-shared'&&fileId!=='document-b'||actor==='a'&&fileId==='document-b')return Response.json({error:{code:403,message:'Isolated permission denied'}},{status:403});
  if(match[2])return Response.json({permissions:[{id:'permission-'+actor,type:'user',role:fileId==='document-shared'?'reader':'owner'}]});
  if(url.searchParams.get('alt')==='media')return new Response(Buffer.from(state.pdfByFile?.[fileId]??(fileId==='document-b'?state.foreignPdf:state.pdf),'base64'),{headers:{'Content-Type':'application/pdf'}});
  return Response.json({id:fileId,name:fileId==='document-shared'?'Shared project PDF':'Authorized project PDF',mimeType:'application/pdf',size:String(Buffer.from(state.pdf,'base64').length),version:state.versions[fileId],trashed:false,capabilities:{canDownload:true}});
 }
 if(url.hostname==='api.weatherapi.com'){
  if(process.env.WEATHER_API_KEY!=='synthetic-weather-test-only'||url.searchParams.get('key')!=='synthetic-weather-test-only')throw Error('Synthetic WeatherAPI only');
  const state=JSON.parse(readFileSync('/tmp/native-fixture-weather-'+process.env.NATIVE_TEST_DATABASE,'utf8'));
  if(state.mode==='refused')return Response.json({error:{message:'PRIVATE_PROVIDER_MESSAGE'}},{status:403});
  return Response.json({location:{name:'Angers',country:'France'},current:{...(state.mode==='invalid'?{}:{temp_c:21}),condition:{text:'Clear'},last_updated_epoch:1700000000}});
 }
 if(url.hostname==='api.elevenlabs.io'){
  if(process.env.ELEVENLABS_API_KEY!=='synthetic-voice-test-only'||!['/v1/speech-to-text','/v1/text-to-speech/synthetic-voice'].includes(url.pathname))throw Error('Synthetic voice fixture only');
  const path='/tmp/native-fixture-voice-'+process.env.NATIVE_TEST_DATABASE;
  const state=JSON.parse(readFileSync(path,'utf8'));state.calls??=[];state.calls.push(url.pathname);writeFileSync(path,JSON.stringify(state));
  const signal=init?.signal;
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  await new Promise((resolve,reject)=>{const finish=()=>{signal?.removeEventListener('abort',cancel);resolve();};const timer=setTimeout(finish,(url.pathname.includes("text-to-speech")?state.speakDelayMs:state.delayMs)??0);const cancel=()=>{clearTimeout(timer);const latest=JSON.parse(readFileSync(path,'utf8'));latest.aborted=(latest.aborted??0)+1;writeFileSync(path,JSON.stringify(latest));reject(new DOMException('Aborted','AbortError'));};signal?.addEventListener('abort',cancel,{once:true});});
  if(url.pathname==='/v1/speech-to-text'&&state.failStt)return Response.json({error:'Synthetic unavailable'},{status:503});
  if(url.pathname==='/v1/speech-to-text')return Response.json({text:'Présente les missions autorisées, sans modification.',language_code:'fr'});
  // A local WAV exercises actual HTMLAudioElement playback, never ElevenLabs.
  const rate=8000,seconds=state.seconds??3,data=Buffer.alloc(rate*seconds*2),wav=Buffer.alloc(44+data.length);
  if(state.audible)for(let i=0;i<data.length/2;i++)data.writeInt16LE(Math.round(5000*Math.sin(2*Math.PI*220*i/rate)),i*2);
  wav.write('RIFF',0);wav.writeUInt32LE(36+data.length,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(data.length,40);data.copy(wav,44);return new Response(wav,{headers:{'Content-Type':'audio/wav'}});
 }
 if(url.hostname==='api.openai.com'){const serialized=String(init?.body??'');const state=JSON.parse(readFileSync('/tmp/native-fixture-google-state-'+process.env.NATIVE_TEST_DATABASE,'utf8'));if(state.companyReceipt&&serialized.includes('src/lib/knowledge/melodie-digital/identity.ts')){
 const composer=serialized.includes('Tu es Clara, la présence conversationnelle de Clara OS.');
 appendFileSync('/tmp/native-fixture-company-'+process.env.NATIVE_TEST_DATABASE,JSON.stringify({phase:composer?'composer':'reasoning',hasRepositorySource:true,hasEmptyOffers:serialized.includes('offers.ts'),scopePresent:serialized.includes('Projet canonique sélectionné : p1')})+'\n');
 if(composer)return Response.json({id:'synthetic',object:'response',status:'completed',output_text:'SIMULATED — documented company records received; detailed Services offer and commercial priority remain unestablished.',output:[{id:'synthetic-message',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:'SIMULATED — documented company records received; detailed Services offer and commercial priority remain unestablished.',annotations:[]}]}]});
 }if(state.personalityReceipt&&serialized.includes('Tu es Clara, la présence conversationnelle de Clara OS.')){
 const payload=JSON.parse(serialized),instructions=payload.instructions??'';
 if(!instructions.includes('PERSONNALITÉ HISTORIQUE DE CLARA')||!instructions.includes('No tool use or permission changes')||!instructions.includes('untrusted evidence'))throw Error('Missing existing personality or authority instructions');
 const namePresent=payload.input.includes('Prénom : Camille'),unknownName=payload.input.includes('Prénom : non identifié');
 if(!namePresent&&!unknownName)throw Error('Unexpected personal identity in fixture');
 const locale=state.personalityReceipt.locale,kind=state.personalityReceipt.kind;
 const languages={fr:'français',en:'anglais',es:'espagnol',de:'allemand',it:'italien'};if(!payload.input.includes('Réponds en '+languages[locale]))throw Error('Active locale did not reach the actual GPT request');
 const samples={
  fr:{greeting:'Bonjour'+(namePresent?' Camille':'')+' ! Comment vas-tu ?',simple:'Oui, on peut regarder ça ensemble.',professional:'Je peux t’aider à préparer les étapes utiles, sans engager d’action à ta place.',resume:'On reprend notre échange précédent. Tu préfères qu’on commence par quel point ?',voice:'Je t’écoute. On peut faire le point ensemble.'},
  en:{greeting:'Hi'+(namePresent?' Camille':'')+'! How are you?',simple:'Yes, we can look at that together.',professional:'I can help you prepare the next steps, without taking action on your behalf.',resume:'Let’s pick up our previous conversation. Where would you like to start?',voice:'I’m listening. We can go through it together.'},
  es:{greeting:'Hola'+(namePresent?' Camille':'')+'! ¿Cómo estás?',simple:'Sí, podemos verlo juntos.',professional:'Puedo ayudarte a preparar los pasos útiles, sin actuar en tu nombre.',resume:'Retomemos nuestra conversación. ¿Por dónde prefieres empezar?',voice:'Te escucho. Podemos revisarlo juntos.'},
  de:{greeting:'Hallo'+(namePresent?' Camille':'')+'! Wie geht es dir?',simple:'Ja, das können wir gemeinsam ansehen.',professional:'Ich kann dir helfen, die nächsten Schritte vorzubereiten, ohne in deinem Namen zu handeln.',resume:'Knüpfen wir an unser Gespräch an. Womit möchtest du anfangen?',voice:'Ich höre dir zu. Wir können es gemeinsam durchgehen.'},
  it:{greeting:'Ciao'+(namePresent?' Camille':'')+'! Come stai?',simple:'Sì, possiamo guardarlo insieme.',professional:'Posso aiutarti a preparare i prossimi passi, senza agire al posto tuo.',resume:'Riprendiamo il nostro scambio. Da dove preferisci cominciare?',voice:'Ti ascolto. Possiamo fare il punto insieme.'}
 };
 const content=samples[locale]?.[kind];if(!content)throw Error('Explicit personality fixture case required');
 appendFileSync('/tmp/native-fixture-personality-'+process.env.NATIVE_TEST_DATABASE,JSON.stringify({locale,kind,personality:true,authenticatedName:namePresent,unknownName,history:payload.input.includes('HISTORIQUE RÉCENT'),priorPreference:payload.input.includes('Préfère des réponses courtes'),tools:!!payload.tools?.length,content})+'\n');
 return Response.json({id:'synthetic',object:'response',status:'completed',output_text:content,output:[{id:'synthetic-message',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:content,annotations:[]}]}]});
 }if(state.documentContinuityFixture){const payload=JSON.parse(serialized);const content=nativeDocumentCognitionFixture(payload);appendFileSync('/tmp/native-fixture-document-prompts-'+process.env.NATIVE_TEST_DATABASE,JSON.stringify({phase:serialized.includes('Retourne UNIQUEMENT un JSON valide:')?'structured':serialized.includes('Tu es un moteur cognitif métier')?'brain':'composer',sourceA:serialized.includes('12 PAR LED'),sourceB:serialized.includes('16 A monophase'),untrustedGuard:!!payload.instructions,tools:!!payload.tools?.length})+'\n');return Response.json({id:'synthetic',object:'response',status:'completed',output_text:content,output:[{id:'synthetic-message',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:content,annotations:[]}]}]});}if(serialized.includes('LOT2_AUTHORIZED_PDF'))appendFileSync(googleProofFile,JSON.stringify({ownDocument:true,foreignAbsent:!serialized.includes('LOT2_FOREIGN_DOCUMENT'),phase:serialized.includes('Tu es Clara, la présence conversationnelle de Clara OS.')?'composer':'brain'})+'\n');if(serialized.includes('LOT1_DIALOGUE')){const proof={phase:serialized.includes('Tu es Clara, la présence conversationnelle de Clara OS.')?'composer':'brain',ownContactPresent:serialized.includes('PRIVATE_prospect-a'),foreignContactAbsent:!serialized.includes('PRIVATE_prospect-b')&&!serialized.includes('PRIVATE_prospect-p2')&&!serialized.includes('PRIVATE_prospect-p3')&&!serialized.includes('unbound-history')};appendFileSync(scopeProofFile,JSON.stringify(proof)+'\n');}return Response.json({id:'synthetic',object:'response',status:'completed',output_text:serialized.includes('Retourne UNIQUEMENT un JSON valide:')?JSON.stringify({entities:[],facts:[],ambiguities:[],conflicts:[]}):'Isolated Clara response',output:[{id:'synthetic-message',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:serialized.includes('Retourne UNIQUEMENT un JSON valide:')?JSON.stringify({entities:[],facts:[],ambiguities:[],conflicts:[]}):'Isolated Clara response',annotations:[]}]}]});}
 throw Error('All real providers are blocked in the native runtime fixture');
};
