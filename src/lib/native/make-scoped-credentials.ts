import {RegistryError,type RegistryQuery} from '@/lib/canonical/registry';
import {nativeContext} from './scoped-context';
import {nativeMakeReadAuthority} from './make-read-authority';
import {CredentialStore,type CredentialPersistence} from '@/lib/connections/credential-store';

/** Clone-only certificate. Production must never interpret this as a grant. */
const CLONE_HOST='ep-morning-frog-b2pbns02.c-6.eu-central-1.aws.neon.tech';
const CLONE_ROLE='clara_make_runtime_login';
const CLONE_CONNECTION='make-read-fixture-249-20261106';
const CLONE_WORKSPACE='melodie-digital';
const CLONE_SCENARIO='find-drive-document';

export function validateMakeCloneRuntime(env:NodeJS.ProcessEnv=process.env):boolean{
  // No fallback to a privileged or production URL.
  if(env.POSTGRES_URL||env.VERCEL_ENV||env.VERCEL_PROJECT_ID||
    env.VERCEL_TARGET_ENV||env.CLARA_RECETTE_MODE||
    env.CLARA_OS_RUNTIME_MODE||!env.DATABASE_URL)return false;
  try{
    const url=new URL(env.DATABASE_URL);
    return ['postgres:','postgresql:'].includes(url.protocol)&&
      url.hostname===CLONE_HOST&&decodeURIComponent(url.username)===CLONE_ROLE&&
      url.pathname==='/neondb'&&Boolean(url.password)&&
      (url.port===''||url.port==='5432')&&!url.hash&&
      url.searchParams.getAll('sslmode').length===1&&
      url.searchParams.get('sslmode')==='require'&&
      [...url.searchParams.keys()].every(k=>['sslmode','channel_binding'].includes(k));
  }catch{return false;}
}

/** Read-only persistence via an audited native SQL function, never direct table SELECT.
 * The SQL function checks the authenticated native session and a revocable
 * user/workspace/client/project/scenario grant again on each load.
 */
export function scopedMakeReadCredentialStore(
  connectionId:string,
  scenarioKey:string,
  query?:RegistryQuery,
  environment:NodeJS.ProcessEnv=process.env,
):CredentialStore{
  if(connectionId!==CLONE_CONNECTION||scenarioKey!==CLONE_SCENARIO||
    !validateMakeCloneRuntime(environment))
    throw new RegistryError(403,'NATIVE_MAKE_CLONE_RUNTIME_DENIED');
  const secret=environment.CLARA_MAKE_CLONE_ENCRYPTION_KEY;
  const key=secret?Buffer.from(secret,'base64'):null;
  if(!key||key.length!==32||key.toString('base64')!==secret)
    throw new RegistryError(503,'NATIVE_MAKE_CLONE_KEY_REQUIRED');

  const persistence:CredentialPersistence={
    async load(id){
      const ctx=nativeContext();
      if(id!==connectionId||!ctx||ctx.scope.workspaceId!==CLONE_WORKSPACE)
        throw new RegistryError(403,'NATIVE_MAKE_SCOPE_DENIED');
      const proof=await nativeMakeReadAuthority.authorize({
        workspaceId:ctx.scope.workspaceId,clientId:ctx.scope.clientId,
        projectId:ctx.scope.projectId,userId:ctx.userId,scenarioKey:CLONE_SCENARIO,
      });
      if(!proof||proof.connectionId!==connectionId)
        throw new RegistryError(403,'NATIVE_MAKE_AUTHORITY_REQUIRED');
      const s=ctx.scope;
      // SQL deliberately returns only the fixed encrypted envelope.
      // Do not log or return the envelope in a response.
      try{
        const rows=await (query??ctx.query)`
          SELECT clara_make_runtime_scope.native_make_read_ciphertext(
            ${s.digest},${s.workspaceId},${s.clientId},${s.projectId},
            ${s.sessionId},${scenarioKey}
          ) AS encrypted
        `;
        const row=(rows[0] as {encrypted?:unknown}|undefined)?.encrypted;
        if(typeof row!=='string'||row.length>12000)
          throw new RegistryError(403,'NATIVE_MAKE_MATERIAL_DENIED');
        return row;
      }catch{throw new RegistryError(403,'NATIVE_MAKE_MATERIAL_DENIED');}
    },
    async save(){throw new RegistryError(403,'NATIVE_MAKE_PROVISIONING_DENIED');},
  };
  return new CredentialStore(persistence,key);
}
