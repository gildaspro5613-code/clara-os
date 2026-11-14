/**
 * Make credential: clone-only, one-time provisioner. No secret files or provider calls.
 * Usage: node src/scripts/provision-make-clone-credential.mjs --check|--commit
 */
import {createCipheriv,createDecipheriv,randomBytes,timingSafeEqual} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createInterface} from 'node:readline/promises';

export const TARGET=Object.freeze({
 hostname:'ep-morning-frog-b2pbns02.c-6.eu-central-1.aws.neon.tech',
 database:'neondb',role:'clara_make_provisioner_login',
 connectionId:'make-read-fixture-249-20261106',
 workspaceId:'melodie-digital',scenario:'find-drive-document',scenarioId:7295042,
});
function reject(message){throw new Error(message);}

export function assertCloneUrl(text){
 if(typeof text!=='string'||!text.trim())reject('Clone DATABASE_URL missing');
 let url;try{url=new URL(text);}catch{reject('Invalid clone URL');}
 if(!['postgres:','postgresql:'].includes(url.protocol)
   ||url.hostname!==TARGET.hostname
   ||decodeURIComponent(url.username)!==TARGET.role
   ||url.pathname!=='/'+TARGET.database||!url.password
   ||url.hash!==''||(url.port!==''&&url.port!=='5432')
   ||url.searchParams.getAll('sslmode').length!==1
   ||url.searchParams.get('sslmode')!=='require'
   ||[...url.searchParams.keys()].some(k=>!['sslmode','channel_binding'].includes(k))
   ||(url.searchParams.has('channel_binding')
      &&(url.searchParams.getAll('channel_binding').length!==1
         ||url.searchParams.get('channel_binding')!=='require')))
   reject('Not the exact isolated Make clone/role');
 return text;
}

export function parseKey(value){
 if(typeof value!=='string'||!/^[a-zA-Z0-9+/]{43}=$/.test(value))
   reject('Expected a distinct base64 AES-256 key');
 const key=Buffer.from(value,'base64');
 if(key.length!==32||key.toString('base64')!==value)reject('Invalid AES-256 key');
 return key;
}

/** An unrelated legacy Clara key may have a different format.
 * Refuse genuine key reuse (base64, base64url, or hex) without requiring
 * the legacy secret to be parseable as a new clone key. Never log either key.
 */
export function assertDistinctCloneKey(cloneKey,legacyValue){
 if(!Buffer.isBuffer(cloneKey)||cloneKey.length!==32)
   reject('Invalid clone key');
 if(typeof legacyValue!=='string'||!legacyValue.trim())return true;
 const raw=legacyValue.trim();
 let comparison=null;
 if(/^[0-9a-fA-F]{64}$/.test(raw))comparison=Buffer.from(raw,'hex');
 else if(/^[A-Za-z0-9+/_-]{43}=?$/.test(raw))
   comparison=Buffer.from(raw.replace(/-/g,'+').replace(/_/g,'/'),'base64');
 if(comparison && comparison.length===32){
   const reused=timingSafeEqual(cloneKey,comparison);
   comparison.fill(0);
   if(reused)reject('The clone needs a separate encryption key');
 }
 return true;
}

/** Validate the decrypted structure without ever logging or returning the token. */
export function assertMakeReadCredentials(input){
 if(!input||typeof input!=='object'||Array.isArray(input)
   ||Object.keys(input).sort().join('|')!=='api|scenarios')
   reject('Unexpected credential structure');
 const {api,scenarios}=input;
 if(!api||typeof api!=='object'||Array.isArray(api)
   ||Object.keys(api).sort().join('|')!=='token|zone'
   ||api.zone!=='eu1'||typeof api.token!=='string'
   ||api.token.length<16||api.token.length>4096||/[\r\n]/.test(api.token))
   reject('Unexpected API credential');
 if(!scenarios||typeof scenarios!=='object'||Array.isArray(scenarios)
   ||Object.keys(scenarios).join('|')!==TARGET.scenario)
   reject('Unexpected Make scope');
 const scenario=scenarios[TARGET.scenario];
 if(!scenario||typeof scenario!=='object'||Array.isArray(scenario)
   ||Object.keys(scenario).sort().join('|')!=='scenarioId|transport'
   ||scenario.transport!=='api'||scenario.scenarioId!==TARGET.scenarioId)
   reject('Unexpected scenario contract');
 return true;
}

export function encryptEnvelope(credentials,key){
 if(!Buffer.isBuffer(key)||key.length!==32)reject('Invalid encryption key');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(credentials),'utf8'),cipher.final()]);
 const payload=JSON.stringify({iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')});
 encrypted.fill(0);return payload;
}
export function decryptEnvelope(payload,key){
 const e=JSON.parse(payload),cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));
 cipher.setAuthTag(Buffer.from(e.tag,'base64'));
 return JSON.parse(Buffer.concat([cipher.update(Buffer.from(e.ciphertext,'base64')),cipher.final()]).toString('utf8'));
}
export function assertSqlPreflight(v){
 if(!v||v.runtime_role!==TARGET.role||v.session_role!==TARGET.role
   ||v.runtime_database!==TARGET.database||v.can_provision!==true
   ||v.can_read_connections!==false||v.can_read_credentials!==false
   ||v.can_write_credentials!==false||v.can_write_connections!==false
   ||v.can_admin_grants!==false||v.can_create_public!==false)
   reject('Unsafe database role/privileges');
 return true;
}

function assertNoForeignRuntime(){
 if(process.env.DATABASE_URL||process.env.POSTGRES_URL||process.env.VERCEL_ENV
   ||process.env.VERCEL_PROJECT_ID||process.env.VERCEL_TARGET_ENV||process.env.CLARA_RECETTE_MODE)
   reject('Ambiguous database/runtime environment');
}

async function main(){
 const mode=process.argv[2];
 if(!['--check','--verify','--commit'].includes(mode)||process.argv.length!==3)
   reject('Usage: node src/scripts/provision-make-clone-credential.mjs --check|--verify|--commit');
 assertNoForeignRuntime();
 const url=assertCloneUrl(process.env.CLARA_MAKE_CLONE_PROVISIONER_URL);
 const {neon}=await import('@neondatabase/serverless');
 const sql=neon(url);
 const [meta]=await sql`
  SELECT current_user::text AS runtime_role,session_user::text AS session_role,
    current_database()::text AS runtime_database,
    has_function_privilege(current_user,'clara_make_runtime_scope.provision_make_read_ciphertext_once(text)','EXECUTE') AS can_provision,
    has_table_privilege(current_user,'public.clara_connections','SELECT') AS can_read_connections,
    has_table_privilege(current_user,'public.clara_connection_credentials','SELECT') AS can_read_credentials,
    has_table_privilege(current_user,'public.clara_connection_credentials','INSERT') AS can_write_credentials,
    has_table_privilege(current_user,'public.clara_connections','UPDATE') AS can_write_connections,
    has_function_privilege(current_user,'public.clara_native_make_admin_command(text,text,text,text,text,text,jsonb)','EXECUTE') AS can_admin_grants,
    has_schema_privilege(current_user,'public','CREATE') AS can_create_public
 `;
 assertSqlPreflight(meta);
 if(mode==='--check'){
   console.log('CLONE MAKE : role, database and permissions OK. No credentials stored.');
   return;
 }

 if(mode==='--verify'){
   // Independent ciphertext integrity proof with the dedicated clone key.
   // The DB readback function is fixed to the existing Make connection.
   const rawKey=process.env.CLARA_MAKE_CLONE_ENCRYPTION_KEY;
   delete process.env.CLARA_MAKE_CLONE_ENCRYPTION_KEY;
   const key=parseKey(rawKey);
   try{
     assertDistinctCloneKey(key,process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY);
     const [row]=await sql`SELECT clara_make_runtime_scope.verify_make_ciphertext_readback() AS encrypted`;
     if(!row||typeof row.encrypted!=='string'||row.encrypted.length>12000)
       reject('Missing encrypted readback');
     const candidate=decryptEnvelope(row.encrypted,key);
     assertMakeReadCredentials(candidate);
   }finally{key.fill(0);}
   console.log('MAKE CLONE : AES-256-GCM readback verified; connection remains CONFIGURED. No Make run.');
   return;
 }

 const token=process.env.CLARA_MAKE_API_TOKEN;
 delete process.env.CLARA_MAKE_API_TOKEN;
 if(typeof token!=='string'||token.length<16||token.length>4096||/[\r\n]/.test(token))
   reject('Make token missing or invalid');
 const rawKey=process.env.CLARA_MAKE_CLONE_ENCRYPTION_KEY;
 delete process.env.CLARA_MAKE_CLONE_ENCRYPTION_KEY;
 const key=parseKey(rawKey);
 try{assertDistinctCloneKey(key,process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY);}
 catch{key.fill(0);throw new Error('Clone encryption key rejected');}
 if(!process.stdin.isTTY||!process.stdout.isTTY){
   key.fill(0);reject('A direct terminal confirmation is required');
 }
 const rl=createInterface({input:process.stdin,output:process.stdout});
 let answer;
 try{answer=await rl.question('Type CLONE to store the encrypted secret in the isolated clone: ');}
 finally{rl.close();}
 if(answer!=='CLONE'){key.fill(0);reject('Cancelled');}
 const credentials={api:{token,zone:'eu1'},scenarios:{[TARGET.scenario]:{transport:'api',scenarioId:TARGET.scenarioId}}};
 let envelope;
 try{
  envelope=encryptEnvelope(credentials,key);
  const opened=decryptEnvelope(envelope,key);
  if(opened.api.token!==token||opened.api.zone!=='eu1'
    ||opened.scenarios[TARGET.scenario].scenarioId!==TARGET.scenarioId)
    reject('Local encryption/decryption verification failed');
 }finally{key.fill(0);}
 const [out]=await sql`SELECT clara_make_runtime_scope.provision_make_read_ciphertext_once(${envelope}) AS state`;
 if(out?.state!=='MAKE_CIPHERTEXT_STORED_INACTIVE')reject('Unconfirmed provision');
 console.log('MAKE CLONE : encrypted credentials stored; CONFIGURED but not ACTIVE.');
}
const entry=process.argv[1]?pathToFileURL(resolve(process.argv[1])).href:'';
if(import.meta.url===entry){
 main().catch(()=>{
   // SQL driver errors might include parameters: never print error objects.
   console.error('Controlled refusal: verify prerequisites without printing secrets. No retry.');
   process.exitCode=1;
 });
}
