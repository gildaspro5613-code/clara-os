import {appendFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const database='postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic';
if(process.env.DATABASE_URL!==database||process.env.POSTGRES_URL||!/^native_browser_[a-f0-9]{32}$/.test(process.env.NATIVE_TEST_DATABASE??'')||process.env.OPENAI_API_KEY!=='synthetic-test-only')throw Error('Exact isolated runtime fixture required');
const attemptsFile='/tmp/native-fixture-global-attempts-'+process.env.NATIVE_TEST_DATABASE;writeFileSync(attemptsFile,'');
const literal=v=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(url.hostname==='api.invalid'){
  const body=JSON.parse(String(init?.body));
  if(!/^SELECT clara_(native_|registry_)/.test(body.query)&&!/^SELECT m.workspace_id FROM clara_auth_sessions s JOIN clara_workspace_memberships/.test(body.query)){appendFileSync(attemptsFile,'GLOBAL_LOADER_ATTEMPT\n');throw Error('Global SQL loader forbidden in native browser fixture');}
  const statement=body.query.replace(/\$(\d+)/g,(_,n)=>literal(body.params[Number(n)-1]));
  try{
   const output=execFileSync('docker',['exec','clara-canonical-test-postgres','psql','-U','postgres','-d',process.env.NATIVE_TEST_DATABASE,'-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`SELECT row_to_json(r) FROM (${statement})r`],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
   const rows=output.trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)),names=Object.keys(rows[0]??{});
   return Response.json({fields:names.map(name=>({name,dataTypeID:3802})),rows:rows.map(r=>names.map(n=>JSON.stringify(r[n]))),rowCount:rows.length,command:'SELECT',rowAsArray:true});
  }catch(e){return Response.json({message:'Isolated authority error',code:String(e.stderr).match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]??'XX000'},{status:400});}
 }
 if(url.hostname==='api.openai.com')return Response.json({id:'synthetic',object:'response',status:'completed',output_text:'Isolated Clara response',output:[{id:'synthetic-message',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:'Isolated Clara response',annotations:[]}]}]});
 throw Error('All real providers are blocked in the native runtime fixture');
};
