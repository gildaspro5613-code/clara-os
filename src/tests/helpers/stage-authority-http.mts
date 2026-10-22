/** Local-only bilateral reception adapter. Real handlers/SQL; no Neon HTTP certification. */
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {neonConfig} from '@neondatabase/serverless';
const resumed=process.env.STAGE_FIXTURE_DATABASE;
const db=resumed??'stage_http_'+randomUUID().replaceAll('-',''),container='clara-canonical-test-postgres';
if(!/^stage_http_[a-f0-9]{32}$/.test(db))throw Error('Isolated fixture database required');
if(!resumed)execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);
const pg=(s:string)=>execFileSync('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',s],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
if(!resumed)for(const m of ['001_authenticated_workspaces','002_verified_auth_identities','008_canonical_client_project_registry','009_canonical_archive_authority','010_canonical_archive_serialization','012_native_resource_authority','027_canonical_stage_decisions'])execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync('db/migrations/'+m+'.sql'),stdio:['pipe','pipe','pipe']});
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
if(!resumed)pg(`INSERT INTO clara_auth_users(id) VALUES('a'),('b'); INSERT INTO clara_auth_workspaces(id) VALUES('w'),('other-w');INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('fixture','a','a'),('fixture','b','b');INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('a','w','owner'),('b','w','member');INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${hash('A'.repeat(43))}','a',NOW()+INTERVAL '1 hour'),('${hash('B'.repeat(43))}','b',NOW()+INTERVAL '1 hour'),('${hash('C'.repeat(43))}','a',NOW()+INTERVAL '1 hour');INSERT INTO clara_registry_clients(workspace_id,id,display_name,created_by) VALUES('w','c','Synthetic','a');INSERT INTO clara_registry_projects(workspace_id,id,client_id,display_name,created_by) VALUES('w','p','c','Synthetic','a');INSERT INTO clara_registry_client_access(workspace_id,client_id,user_id,can_read,can_archive,can_manage) VALUES('w','c','a',true,true,true);INSERT INTO clara_registry_project_access(workspace_id,project_id,user_id,can_read,can_archive,can_manage,can_mutate_light) VALUES('w','p','a',true,true,true,false);INSERT INTO clara_sessions(id,data) VALUES('native:stage','{"conversation":[]}');INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason) VALUES('session','native:stage','a','w','c','p',encode(sha256(convert_to('{"conversation": []}','UTF8')),'hex'),'a','Explicit isolated synthetic stage reception');`);
process.env.DATABASE_URL='postgresql://synthetic:synthetic@stage.invalid/synthetic';delete process.env.POSTGRES_URL;
process.env.CLARA_AUTH_APP_ORIGIN='https://os.fixture.example';
process.env.CLARA_LIVE_PRODUCT_TOKEN='synthetic-isolated-stage-product';process.env.CLARA_LIVE_WORKSPACE_ID='w';process.env.CLARA_LIVE_CAPABILITIES='["canonical-links:v1","stage:light:mutate:v1"]';process.env.CLARA_LIVE_CALLBACK_BASE_URL='https://live.fixture.example';delete process.env.CLARA_EXTERNAL_PRODUCTS_JSON;
neonConfig.fetchEndpoint='https://sql.fixture.invalid/query';
const nativeFetch=globalThis.fetch;let liveOrigin='',liveProject=resumed?pg("SELECT live_project_id FROM clara_registry_project_links WHERE workspace_id='w' AND project_id='p'").trim():'';
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(['sql.fixture.invalid','api.invalid'].includes(url.hostname)){
  const b=JSON.parse(String(init?.body));const lit=(v:unknown)=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
  const statement=b.query.replace(/\$(\d+)/g,(_:string,i:string)=>lit(b.params[Number(i)-1]));
  try{const rows=pg(`SELECT row_to_json(r) FROM (${statement})r`).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));const names=Object.keys(rows[0]??{});return Response.json({fields:names.map(name=>({name,dataTypeID:typeof rows[0][name]==='object'?3802:25})),rows:rows.map(r=>names.map(n=>typeof r[n]==='object'?JSON.stringify(r[n]):String(r[n]))),rowCount:rows.length,command:'SELECT',rowAsArray:true});}
  catch(e){return Response.json({message:'Isolated SQL denial',code:String((e as {stderr?:unknown}).stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]??'XX000'},{status:400});}
 }
 if(url.hostname==='live.fixture.example'&&liveOrigin.startsWith('https://127.0.0.1:'))return nativeFetch(liveOrigin+url.pathname,init);
 throw Error('External transport forbidden by local bilateral fixture');
};
const core=await import('../../app/api/core/canonical/stage/route');
const native=await import('../../app/api/native/stage/route');
const server=createServer(async(req,res)=>{
 try{let raw='';for await(const part of req){raw+=part;if(raw.length>20000)throw Error('Too large');}
 if(req.url==='/fixture/expire-owner-session'){pg(`UPDATE clara_auth_sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE token_hash='${hash('A'.repeat(43))}'`);res.end('{}');return;}
 if(req.url==='/fixture/bind'){
  const b=JSON.parse(raw);if(!/^https:\/\/127\.0\.0\.1:\d+$/.test(b.origin)||!/^[a-zA-Z0-9_-]+$/.test(b.projectId))throw Error('Invalid isolated binding');if(liveProject&&liveProject!==b.projectId)throw Error('Cannot rebind project');liveOrigin=b.origin;
  if(!liveProject)pg(`INSERT INTO clara_registry_identity_links(workspace_id,os_user_id,live_user_id,proof_id) VALUES('w','a','u','ip');INSERT INTO clara_registry_project_links(workspace_id,project_id,client_id,live_project_id,live_user_id,os_user_id,proof_id) VALUES('w','p','c','${b.projectId}','u','a','pp');`);liveProject=b.projectId;res.end('{}');return;
 }
 const request=new Request('https://os.fixture.example'+req.url,{method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter((e):e is [string,string|string[]]=>e[1]!==undefined).map(([k,v])=>[k,Array.isArray(v)?v.join(','):v])),...(req.method==='POST'?{body:raw}:{})});
 const response=req.url?.startsWith('/api/native/stage')?await native.POST(request):req.url==='/api/core/canonical/stage'?await core.POST(request):new Response('',{status:404});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
 }catch{res.writeHead(500);res.end('{"success":false}');}
});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:(server.address() as {port:number}).port,database:db})));
const cleanup=()=>{server.close();if(process.env.STAGE_FIXTURE_PRESERVE!=='1')execFileSync('docker',['exec',container,'dropdb','-U','postgres',db]);process.exit(0);};process.on('SIGTERM',cleanup);process.on('SIGINT',cleanup);
