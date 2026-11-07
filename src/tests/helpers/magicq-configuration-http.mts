/** Local reception only: actual OS handlers/SQL, Neon HTTP adapted to disposable PostgreSQL. */
import {createServer} from 'node:http';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const root=process.env.CANONICAL_STAGE_OS_REPO||process.cwd();
const require=createRequire(root+'/package.json');
const {neonConfig}=await import(require.resolve('@neondatabase/serverless'));
const container=process.env.MAGICQ_TEST_CONTAINER||'clara-magicq-config-test-postgres';
if(!['clara-magicq-config-test-postgres','clara-canonical-test-postgres'].includes(container))throw Error('Test container required');
const db=process.env.CONNECTOR_FIXTURE_DATABASE??'connector_http_'+randomUUID().replaceAll('-','');
if(!/^connector_http_[a-f0-9]{32}$/.test(db))throw Error('Disposable database required');
if(!process.env.CONNECTOR_FIXTURE_DATABASE)execFileSync('docker',['exec',container,'createdb','-U','postgres',db]);
const exec=promisify(execFile);
const pg=async(s:string)=>(await exec('docker',['exec',container,'psql','-U','postgres','-d',db,'-qAt','-v','ON_ERROR_STOP=1','-c',s])).stdout;
if(!process.env.CONNECTOR_FIXTURE_DATABASE)execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-q','-v','ON_ERROR_STOP=1'],{input:readFileSync(root+'/db/migrations/029_magicq_configuration_revision.sql'),stdio:['pipe','pipe','pipe']});
process.env.CLARA_MAGICQ_NETWORK_ENABLED='false';
process.env.DATABASE_URL='postgresql://synthetic:synthetic@connector.invalid/synthetic';delete process.env.POSTGRES_URL;
process.env.CLARA_LIVE_PRODUCT_TOKEN='synthetic-connector-product';process.env.CLARA_LIVE_WORKSPACE_ID='isolated-connector-workspace';process.env.CLARA_LIVE_CAPABILITIES='[]';delete process.env.CLARA_EXTERNAL_PRODUCTS_JSON;
neonConfig.fetchEndpoint='https://sql.connector.invalid/query';
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(url.hostname!=='sql.connector.invalid')throw Error('No external or hardware transport allowed');
 const b=JSON.parse(String(init?.body));const lit=(v:unknown)=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
 const statement=b.query.replace(/\$(\d+)/g,(_:string,i:string)=>lit(b.params[Number(i)-1]));
 try{
 const selecting=/^\s*SELECT\b/i.test(statement);
 const rows=selecting?(await pg(`SELECT row_to_json(r) FROM (${statement})r`)).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)):(await pg(statement),[]);
 const names=Object.keys(rows[0]??{});
 return Response.json({fields:names.map(name=>({name,dataTypeID:typeof rows[0][name]==='number'?23:typeof rows[0][name]==='boolean'?16:typeof rows[0][name]==='object'?3802:25})),rows:rows.map(r=>names.map(n=>r[n]===null?null:typeof r[n]==='boolean'?(r[n]?'t':'f'):typeof r[n]==='object'?JSON.stringify(r[n]):String(r[n]))),rowCount:rows.length,command:selecting?'SELECT':'UPDATE',rowAsArray:true});
 }catch(e){console.error(String((e as any).stderr));return Response.json({message:'Isolated SQL failed',code:'XX000'},{status:400});}
};
const config=await import(root+'/src/app/api/external/lighting/onboarding/configuration/route.ts');
const session=await import(root+'/src/app/api/external/lighting/onboarding/session/route.ts');
const server=createServer(async(req,res)=>{try{
 let raw='';for await(const part of req){raw+=part;if(raw.length>20000)throw Error('Too large');}
 const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers as any,...(req.method==='POST'?{body:raw}:{})});
 const route=req.url==='/api/external/lighting/onboarding/configuration'?config:req.url==='/api/external/lighting/onboarding/session'?session:null;
 const response=route&&req.method==='POST'?await route.POST(request):new Response('',{status:405});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
 }catch(e){console.error(e);res.writeHead(500);res.end('{}');}});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:(server.address() as any).port,database:db})));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
