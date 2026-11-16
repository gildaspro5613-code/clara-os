import {neon} from '@neondatabase/serverless';
import {RegistryError,type RegistryQuery} from '@/lib/canonical/registry';

/** Separate least-privileged database role, attached to the SAME exact OS
 * Neon branch/database. This is NOT a second Clara environment. It can only
 * EXECUTE the Connector Builder's approved SECURITY DEFINER functions.
 */
export function ensureSameBuilderDatabase(
 appUrl:string|undefined,builderUrl:string|undefined,
):void{
 if(!appUrl||!builderUrl)
  throw new RegistryError(503,'CONNECTOR_BUILDER_DATABASE_NOT_CONFIGURED');
 try{
  const app=new URL(appUrl),builder=new URL(builderUrl);
  const host=(name:string)=>name.toLowerCase().replace(/-pooler(?=\.)/g,'');
  if(!['postgres:','postgresql:'].includes(app.protocol)||
     !['postgres:','postgresql:'].includes(builder.protocol)||
     !app.username||!builder.username||
     app.username===builder.username||
     !app.hostname||!host(app.hostname).endsWith('.neon.tech')||
     host(app.hostname)!==host(builder.hostname)||
     app.pathname!==builder.pathname||
     (app.port||'5432')!==(builder.port||'5432'))
   throw new Error('builder database scope mismatch');
 }catch{
  // Never echo connection strings, usernames, hosts or passwords.
  throw new RegistryError(503,'CONNECTOR_BUILDER_DATABASE_BINDING_DENIED');
 }
}
/** Same typed SQL template API as Clara OS but never uses its owner role.
 * Every call checks binding again; no fallback to the owner connection.
 */
export const builderSql:RegistryQuery=(strings,...values)=>{
 const appUrl=process.env.DATABASE_URL??process.env.POSTGRES_URL;
 const runtimeUrl=process.env.CLARA_BUILDER_DATABASE_URL;
 ensureSameBuilderDatabase(appUrl,runtimeUrl);
 return (neon(runtimeUrl!) as unknown as RegistryQuery)(strings,...values);
};
