import {nativeDocumentCognitionFixture} from './native-document-cognition-fixture.mjs';
import {googleWorkHttp} from './native-google-work-http-fixture.mjs';
import {generateKeyPairSync,sign} from 'node:crypto';
import {appendFileSync,writeFileSync,readFileSync} from 'node:fs';
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
  const logout=normalized==='UPDATE clara_auth_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL';
  const missionFinalize=body.query.trimStart().startsWith('WITH native_mission_finalize_input AS MATERIALIZED')&&body.query.includes('FOR SHARE OF authority, mission');
  if(!logout&&!missionFinalize&&!/^SELECT clara_(native_|registry_)/.test(body.query)&&!/^SELECT m.workspace_id FROM clara_auth_sessions s JOIN clara_workspace_memberships/.test(body.query)){appendFileSync(attemptsFile,'GLOBAL_LOADER_ATTEMPT\n');throw Error('Global SQL loader forbidden in native browser fixture');}
  const statement=body.query.replace(/\$(\d+)/g,(_,n)=>literal(body.params[Number(n)-1]));
  try{
   if(logout){execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',process.env.NATIVE_TEST_DATABASE,'-q','-v','ON_ERROR_STOP=1','-c',statement],{stdio:['pipe','pipe','pipe']});return Response.json({fields:[],rows:[],rowCount:1,command:'UPDATE',rowAsArray:true});}
   const output=execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',process.env.NATIVE_TEST_DATABASE,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(r) FROM (${statement})r`],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
   const rows=output.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)),names=Object.keys(rows[0]??{});
   return Response.json({fields:names.map(name=>({name,dataTypeID:3802})),rows:rows.map(r=>names.map(n=>JSON.stringify(r[n]))),rowCount:rows.length,command:'SELECT',rowAsArray:true});
  }catch(e){return Response.json({message:'Isolated authority error',code:String(e.stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]??'XX000'},{status:400});}
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
 if(url.hostname==='api.openai.com'){const serialized=String(init?.body??'');const state=JSON.parse(readFileSync('/tmp/native-fixture-google-state-'+process.env.NATIVE_TEST_DATABASE,'utf8'));if(state.documentContinuityFixture){const payload=JSON.parse(serialized);const content=nativeDocumentCognitionFixture(payload);appendFileSync('/tmp/native-fixture-document-prompts-'+process.env.NATIVE_TEST_DATABASE,JSON.stringify({phase:serialized.includes('Retourne UNIQUEMENT un JSON valide:')?'structured':serialized.includes('Tu es un moteur cognitif métier')?'brain':'composer',sourceA:serialized.includes('12 PAR LED'),sourceB:serialized.includes('16 A monophase'),untrustedGuard:!!payload.instructions,tools:!!payload.tools?.length})+'\n');return Response.json({id:'synthetic',object:'response',status:'completed',output_text:content,output:[{id:'synthetic-message',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:content,annotations:[]}]}]});}if(serialized.includes('LOT2_AUTHORIZED_PDF'))appendFileSync(googleProofFile,JSON.stringify({ownDocument:true,foreignAbsent:!serialized.includes('LOT2_FOREIGN_DOCUMENT'),phase:serialized.includes('Tu es Clara, la présence conversationnelle de Clara OS.')?'composer':'brain'})+'\n');if(serialized.includes('LOT1_DIALOGUE')){const proof={phase:serialized.includes('Tu es Clara, la présence conversationnelle de Clara OS.')?'composer':'brain',ownContactPresent:serialized.includes('PRIVATE_prospect-a'),foreignContactAbsent:!serialized.includes('PRIVATE_prospect-b')&&!serialized.includes('PRIVATE_prospect-p2')&&!serialized.includes('PRIVATE_prospect-p3')&&!serialized.includes('unbound-history')};appendFileSync(scopeProofFile,JSON.stringify(proof)+'\n');}return Response.json({id:'synthetic',object:'response',status:'completed',output_text:serialized.includes('Retourne UNIQUEMENT un JSON valide:')?JSON.stringify({entities:[],facts:[],ambiguities:[],conflicts:[]}):'Isolated Clara response',output:[{id:'synthetic-message',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:serialized.includes('Retourne UNIQUEMENT un JSON valide:')?JSON.stringify({entities:[],facts:[],ambiguities:[],conflicts:[]}):'Isolated Clara response',annotations:[]}]}]});}
 throw Error('All real providers are blocked in the native runtime fixture');
};
