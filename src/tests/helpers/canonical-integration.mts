import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const liveRepo=process.env.CANONICAL_LIVE_REPO??resolve(root,'../clara-live');
const python=process.env.CANONICAL_LIVE_PYTHON??resolve(root,'../.venvs/clara-live/bin/python');
const container='clara-canonical-test-postgres';
const db='canonical_audit_'+randomUUID().replaceAll('-','');
const pg=(sql:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',sql],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);
const migrations=execFileSync('rg',['--files','db/migrations'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(p=>/\/(001|002|008|009|010)_/.test(p)).sort();
for(const path of migrations)execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync(resolve(root,path)),stdio:['pipe','pipe','pipe']});
const w='fixture-workspace',osA='os-alice',osB='os-bob';
const tokens=[randomBytes(32).toString('base64url'),randomBytes(32).toString('base64url')];
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
pg(`INSERT INTO clara_auth_users(id) VALUES('${osA}'),('${osB}'); INSERT INTO clara_auth_workspaces(id) VALUES('${w}'); INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('${osA}','${w}','owner'),('${osB}','${w}','member'); INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('verified-fixture','a','${osA}'),('verified-fixture','b','${osB}'); INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${digest(tokens[0])}','${osA}',NOW()+INTERVAL '1 hour'),('${digest(tokens[1])}','${osB}',NOW()+INTERVAL '1 hour');`);
process.env.DATABASE_URL='postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic';delete process.env.POSTGRES_URL;
process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
process.env.CLARA_LIVE_PRODUCT_TOKEN='synthetic-canonical-product-token';
process.env.CLARA_LIVE_WORKSPACE_ID=w;process.env.CLARA_LIVE_CAPABILITIES='["canonical-links:v1"]';
process.env.CLARA_LIVE_CALLBACK_BASE_URL='https://live.fixture.example';delete process.env.CLARA_EXTERNAL_PRODUCTS_JSON;
const nativeFetch=globalThis.fetch;let livePort=0,osDown=false,liveDown=false;
let beforeCommit: (()=>Promise<void>)|null=null;
let failSettlement=false, loseCommitResponse=false, failCancellation=false;
let afterLiveGrant: (()=>Promise<void>)|null=null;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(url.hostname==='api.invalid'){
  const body=JSON.parse(String(init?.body)),literal=(v:unknown)=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
  const statement=body.query.replace(/\$(\d+)/g,(_:string,i:string)=>literal(body.params[Number(i)-1]));
  try{
   const rows=pg(`SELECT row_to_json(r) FROM (${statement}) r`).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
   const names=Object.keys(rows[0]??{}),fields=names.map(name=>({name,dataTypeID:typeof rows[0][name]==='object'?3802:typeof rows[0][name]==='boolean'?16:25}));
   return Response.json({fields,rows:rows.map(r=>names.map(n=>r[n]===null?null:typeof r[n]==='object'?JSON.stringify(r[n]):String(r[n]))),rowCount:rows.length,command:'SELECT',rowAsArray:true});
  }catch(e){const match=String((e as {stderr?:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/);return Response.json({message:'Isolated PostgreSQL error',code:match?.[1]??'XX000'},{status:400});}
 }
 if(url.hostname==='live.fixture.example'){
  if(liveDown)throw Error('Synthetic Live outage');
  const response=await nativeFetch(`http://127.0.0.1:${livePort}${url.pathname}${url.search}`,init);
  if(afterLiveGrant && url.pathname.endsWith('/archive-authorization') && response.ok){
    const hook=afterLiveGrant;afterLiveGrant=null;await hook();
  }
  return response;
 }
 assert.equal(url.hostname,'127.0.0.1','External network forbidden');return nativeFetch(input,init);
};
const registry=await import(resolve(root,'src/app/api/canonical/registry/route.ts'));
const core=await import(resolve(root,'src/app/api/core/canonical/links/route.ts'));
const archives=await import(resolve(root,'src/app/api/documents/live-archives/route.ts'));
const authority=(await import(resolve(root,'src/lib/canonical/archive-authority.ts'))).canonicalArchiveAuthority;
const server=createServer(async(req,res)=>{
 try{
  let data='';for await(const chunk of req){data+=chunk;if(data.length>65536)throw Error('Too large');}
  const request=new Request('https://os.fixture.example'+req.url,{method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter((entry): entry is [string,string|string[]] => entry[1] !== undefined).map(([key,value])=>[key,Array.isArray(value)?value.join(','):value])),...(req.method==='POST'?{body:data}:{})});
  let response:Response;
  if(req.url==='/api/core/canonical/links') {
   const action=JSON.parse(data).action;
   if(action==='archiveCommit' && beforeCommit){const hook=beforeCommit;beforeCommit=null;await hook();}
   response=(osDown || (failSettlement && (action==='archiveCommit'||action==='archiveCancel'||action==='archiveCancelHash')) || (failCancellation && action.startsWith('archiveCancel')))?Response.json({success:false},{status:503}):await core.POST(request);
   if(action==='archiveCommit' && loseCommitResponse){loseCommitResponse=false;response=Response.json({success:false},{status:503});}
  }
  else if(req.url?.startsWith('/api/documents/live-archives'))response=req.method==='GET'?await archives.GET(request):await archives.POST(request);
  else response=req.method==='GET'?await registry.GET(request):await registry.POST(request);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
 }catch{res.writeHead(500);res.end('{}');}
});server.listen(0,'127.0.0.1');await once(server,'listening');const osPort=(server.address() as AddressInfo).port;
const child=spawn(python,[resolve(root,'src/tests/helpers/canonical-live-fixture.py')],{env:{...process.env,CANONICAL_LIVE_REPO:liveRepo,MONGO_URL:'mongodb://127.0.0.1:27039',DB_NAME:db,JWT_SECRET:'synthetic-integration-secret',CLARA_OS_BASE_URL:'https://os.fixture.example',CLARA_OS_PRODUCT_TOKEN:process.env.CLARA_LIVE_PRODUCT_TOKEN,CLARA_OS_PRODUCT_ID:'clara-live',OS_PORT:String(osPort)},stdio:['ignore','pipe','pipe']});
let buffer='';child.stderr.on('data',data=>writeFileSync('/tmp/final-live-fixture-stderr.log',data,{flag:'a'}));
const ready: {port:number;alice:string;bob:string}=await new Promise<{port:number;alice:string;bob:string}>((resolve,reject)=>{child.stdout.on('data',chunk=>{buffer+=chunk;for(const line of buffer.split('\n'))try{const x=JSON.parse(line);if(x.port)resolve(x);}catch{}});child.once('exit',()=>reject(Error('Live fixture exited; inspect isolated stderr log')));setTimeout(()=>reject(Error('Live startup timed out')),20000).unref();});livePort=ready.port;
const passed:string[]=[];
async function os(path:string,body?:unknown,who=0){const response=await nativeFetch(`http://127.0.0.1:${osPort}${path}`,{method:body?'POST':'GET',headers:{cookie:`clara_auth_session=${tokens[who]}`,Origin:'https://os.fixture.example','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()};}
async function live(path:string,body?:unknown,user:'alice'|'bob'='alice'){const response=await nativeFetch(`http://127.0.0.1:${livePort}${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${ready[user]}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()};}
const command=(action:string,extra={},who=0)=>os('/api/canonical/registry',{action,workspaceId:w,...extra},who);
const selection={workspaceId:w,clientId:'c1',projectId:'p1'};
const archive=()=>os('/api/documents/live-archives',selection);
const read=()=>os('/api/documents/live-archives?'+new URLSearchParams(selection));
async function associate(kind:string,project='p1',lp='lp1',who=0){
 const start=await command(kind==='identity'?'beginIdentityLink':'beginProjectLink',kind==='identity'?{}:{clientId:'c1',projectId:project},who);assert.equal(start.status,200,JSON.stringify(start));
 const consent=await live('/api/canonical/link-proofs',{challenge:start.body.data.challenge,approve:true,...(kind==='project'?{liveProjectId:lp}:{})});assert.equal(consent.status,200,JSON.stringify(consent));
 return{start,confirm:()=>command('confirmLink',{challengeId:start.body.data.challengeId,approve:true},who)};
}
try{
 const original=(await live('/fixture/snapshot')).body.projects;
 for(const id of ['c1','c2'])assert.equal((await command('createClient',{id,displayName:'Named '+id})).status,200);
 for(const projectId of ['p1','p2'])assert.equal((await command('createProject',{clientId:'c1',projectId,displayName:'Named '+projectId})).status,200);
 assert.equal((await command('listProjects',{clientId:'c1'})).body.data.length,2);passed.push('client with multiple canonical projects');
 assert.equal((await archive()).status,403);passed.push('unassociated identity denied');
 const identity=await associate('identity');assert.equal((await identity.confirm()).status,200);
 const project=await associate('project');assert.equal((await archive()).status,403);
 assert.equal((await command('confirmLink',{challengeId:project.start.body.data.challengeId,approve:true},1)).status,403);
 assert.equal((await project.confirm()).status,200);passed.push('two authenticated sessions and double consent before authority');
 assert.equal((await archive()).status,403);passed.push('active project denied');
 const lifecycle='/api/canonical/projects/lp1/lifecycle';
 assert.equal((await live(lifecycle,{state:'completed',expectedRevision:0,requestId:'audit-close-request1',approve:true},'bob')).status,403);
 assert.equal((await live(lifecycle,{state:'completed',expectedRevision:0,requestId:'audit-close-request1',approve:true})).status,200);
 const saved=await archive();assert.equal(saved.status,200,JSON.stringify(saved));const repeated=await archive();assert.equal(repeated.status,200);assert.deepEqual(repeated.body.data,saved.body.data);passed.push('close, fresh grant, persisted archive and idempotent repeat');
 assert.equal((await read()).body.data.currentStatus,'completed');passed.push('authorized history consultation');
 assert.equal((await os('/api/documents/live-archives',{...selection,clientId:'c2'})).status,403);
 assert.equal((await os('/api/documents/live-archives',selection,1)).status,403);
 assert.equal((await command('createProject',{clientId:'c2',projectId:'p1',displayName:'conflict'})).status,409);passed.push('other client, unauthorized OS user and identifier conflict denied');
 assert.equal((await live(lifecycle,{state:'active',expectedRevision:1,requestId:'audit-reopen-request',approve:true})).status,200);
 assert.equal((await archive()).status,403);const reopened=await read();assert.equal(reopened.status,200);assert.equal(reopened.body.data.currentStatus,'active');assert.deepEqual(reopened.body.data.reference,saved.body.data);passed.push('reopening denies new archive and preserves history');
 liveDown=true;assert.equal((await read()).status,503);liveDown=false;
 osDown=true;assert.equal((await read()).status,503);osDown=false;passed.push('OS and Live outages fail closed');
 const ticket=await authority.issue({digest:digest(tokens[0]),workspaceId:w},'c1','p1','read');
 pg(`UPDATE clara_registry_authority_tickets SET created_at=NOW()-INTERVAL '2 minutes',expires_at=NOW()-INTERVAL '1 minute' WHERE token_hash='${digest(ticket.ticket)}'`);
 await assert.rejects(authority.redeem(w,ticket.ticket),(e:unknown)=>e!==null && typeof e==='object' && 'status' in e && e.status===403);passed.push('expired scoped ticket denied');
 assert.equal((await command('revokeProjectLink',{clientId:'c1',projectId:'p1'})).status,200);
 assert.equal((await read()).status,403);assert.equal(Number(pg('SELECT count(*) FROM clara_live_archive_references').trim()),1);passed.push('association revocation denies consultation without deleting history');
 assert.deepEqual((await live('/fixture/snapshot')).body.projects,original);passed.push('technical Mongo projects byte-equivalent as JSON before and after');
 const secondProject=await associate('project','p2','lp2');assert.equal((await secondProject.confirm()).status,200);
 const secondLifecycle='/api/canonical/projects/lp2/lifecycle';
 assert.equal((await live(secondLifecycle,{state:'completed',expectedRevision:0,requestId:'audit-second-close1',approve:true})).status,200);
 afterLiveGrant=async()=>{assert.equal((await live(secondLifecycle,{state:'active',expectedRevision:1,requestId:'audit-second-reopen',approve:true})).status,200);};
 const secondSelection={...selection,projectId:'p2'};
 assert.equal((await os('/api/documents/live-archives',secondSelection)).status,403);
 assert.equal((await os('/api/documents/live-archives',secondSelection)).status,403);
 assert.equal((await os('/api/documents/live-archives?'+new URLSearchParams(secondSelection))).body.data.currentStatus,'active');
 assert.deepEqual((await live('/fixture/snapshot')).body.projects,original);
 assert.equal(Number(pg('SELECT count(*) FROM clara_live_archive_references').trim()),1);
 passed.push('reopen acknowledged after grant and before persistence prevents archive');
 // Real HTTP overlap, Mongo CAS and PostgreSQL transactions, not mocked grants.
 assert.equal((await live(secondLifecycle,{state:'completed',expectedRevision:2,requestId:'concurrent-close-0001',approve:true})).status,200);
 const context={digest:digest(tokens[0]),workspaceId:w};
 async function commitTicket(ticket:string,revision:number){
  const response=await nativeFetch(`http://127.0.0.1:${livePort}/api/core/projects/lp2/archive-commit`,{method:'POST',headers:{Authorization:'Bearer synthetic-canonical-product-token','x-clara-product':'clara-live','Content-Type':'application/json'},body:JSON.stringify({schemaVersion:'clara.live-archive-commit-request.v1',operation:'archive',authorizationTicket:ticket,lifecycleRevision:revision,osUserId:osA,workspaceId:w,clientId:'c1',projectId:'p2'})});
  return {status:response.status,body:await response.json()};
 }
 // OS timeout: cancellation fences the still-paused original callback.
 let entered!:()=>void,release!:()=>void;
 const entry=new Promise<void>(r=>entered=r),pause=new Promise<void>(r=>release=r);
 beforeCommit=async()=>{entered();await pause;};
 const fenced=await authority.issue(context,'c1','p2','archive');
 const pending=commitTicket(fenced.ticket,3);await entry;
 assert.equal((await live(secondLifecycle,{state:'active',expectedRevision:3,requestId:'blocked-reopen-0001',approve:true})).status,409);
 assert.equal((await pending).status,403); // Live's bounded OS timeout, then confirmed cancellation.
 assert.equal((await live(secondLifecycle,{state:'active',expectedRevision:3,requestId:'fenced-reopen-0001',approve:true})).status,200);
 release();
 // Late callback is fenced durably, not just by a fresh Live read.
 const fence=await authority.settle(w,fenced.ticket,3,'lp2','commit') as {state:string};
 assert.equal(fence.state,'cancelled');assert.equal(Number(pg('SELECT count(*) FROM clara_live_archive_references').trim()),1);
 await assert.rejects(authority.settle(w,fenced.ticket,4,'lp2','commit'));
 passed.push('real overlap: reopen blocked during commit, timeout cancellation fences delayed persistence, revision conflict denied');
 // Unknown commit AND cancellation outcomes: retain durable reservation, then recover.
 assert.equal((await live(secondLifecycle,{state:'completed',expectedRevision:4,requestId:'unknown-close-0001',approve:true})).status,200);
 const unknown=await authority.issue(context,'c1','p2','archive');failSettlement=true;
 assert.equal((await commitTicket(unknown.ticket,5)).status,503);
 assert.equal((await live(secondLifecycle,{state:'active',expectedRevision:5,requestId:'unknown-reopen-0001',approve:true})).status,409);
 failSettlement=false;
 assert.equal((await live('/api/canonical/projects/lp2/archive-reconciliation',{approve:true},'bob')).status,403);
 assert.equal((await live('/api/canonical/projects/lp2/archive-reconciliation',{approve:true})).status,200);
 assert.equal((await commitTicket(unknown.ticket,5)).status,403);
 assert.equal((await live(secondLifecycle,{state:'active',expectedRevision:5,requestId:'recovered-reopen-01',approve:true})).status,200);
 passed.push('unknown network outcome fails closed; original ticket reconciles and consumes authorization');
 // Commit wins: reopen cannot validate before persistence, but succeeds afterwards.
 assert.equal((await live(secondLifecycle,{state:'completed',expectedRevision:6,requestId:'winning-close-0001',approve:true})).status,200);
 const entry2=new Promise<void>(r=>entered=r),pause2=new Promise<void>(r=>release=r);
 beforeCommit=async()=>{entered();await pause2;};
 const winning=await authority.issue(context,'c1','p2','archive');
 const commit=commitTicket(winning.ticket,7);await entry2;
 assert.equal((await live(secondLifecycle,{state:'active',expectedRevision:7,requestId:'winning-reopen-0001',approve:true})).status,409);
 release();assert.equal((await commit).status,200);
 assert.equal((await commitTicket(winning.ticket,7)).status,403); // consumed, never another write
 assert.equal((await live(secondLifecycle,{state:'active',expectedRevision:7,requestId:'finished-reopen-001',approve:true})).status,200);
 assert.equal(Number(pg('SELECT count(*) FROM clara_live_archive_references').trim()),2);
 passed.push('commit-first overlap: persistence precedes validated reopen; authorization consumed exactly once');
 // OS committed but its response was lost and cancellation is unavailable.
 assert.equal((await live(secondLifecycle,{state:'completed',expectedRevision:8,requestId:'receipt-close-0001',approve:true})).status,200);
 const lost=await authority.issue(context,'c1','p2','archive');loseCommitResponse=true;failCancellation=true;
 assert.equal((await commitTicket(lost.ticket,9)).status,503);
 assert.equal((await live(secondLifecycle,{state:'active',expectedRevision:9,requestId:'receipt-reopen-001',approve:true})).status,409);
 failCancellation=false;
 const reconciled=await live('/api/canonical/projects/lp2/archive-reconciliation',{approve:true});
 assert.equal(reconciled.status,200);assert.equal(reconciled.body.state,'committed');
 assert.equal((await live(secondLifecycle,{state:'active',expectedRevision:9,requestId:'receipt-reopen-001',approve:true})).status,200);
 assert.deepEqual((await os('/api/documents/live-archives?'+new URLSearchParams(secondSelection))).body.data.reference,(await authority.history(context,'c1','p2')));
 passed.push('lost commit acknowledgement recovered from durable OS receipt without duplicate archive');
 const liveRevocation=await nativeFetch(`http://127.0.0.1:${livePort}/api/canonical/link-proofs/${digest(identity.start.body.data.challenge)}`,{method:'DELETE',headers:{Authorization:`Bearer ${ready.alice}`}});
 assert.equal(liveRevocation.status,200);
 assert.equal((await os('/api/documents/live-archives?'+new URLSearchParams(secondSelection))).status,403);
 assert.equal(Number(pg('SELECT count(*) FROM clara_live_archive_references').trim()),2);
 passed.push('Live identity consent revocation denies consultation without deleting administrative references');
 const result={status:'PASS',checks:passed,transport:'real OS handlers and Live routers/auth, isolated PostgreSQL and MongoDB; synthetic Neon HTTP adapter and HTTPS-to-loopback transports; production services and TLS untested',postgresDatabase:db};
 console.log(JSON.stringify(result,null,2));
}finally{
 child.kill('SIGTERM');await once(child,'exit');await new Promise<void>(resolve=>server.close(()=>resolve()));
 execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]);
}
