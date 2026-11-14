import {assertRecetteExternalExecutionBlocked} from '@/lib/recette/external-execution-guard';
import type {BrevoReadKind} from './api-key-read';
import type {BrevoFetch} from './client';

/** Server-only credentials. Never accept IDs, scopes or URLs from chat. */
type M2MEnv={BREVO_M2M_CLIENT_ID?:string;BREVO_M2M_CLIENT_SECRET?:string};
const LIVE_ENV=():M2MEnv=>({
 BREVO_M2M_CLIENT_ID:process.env.BREVO_M2M_CLIENT_ID,
 BREVO_M2M_CLIENT_SECRET:process.env.BREVO_M2M_CLIENT_SECRET,
});
const TOKEN_ENDPOINT='https://api.brevo.com/realms/partner/oauth/token';
const READ_SCOPES:Record<BrevoReadKind,string>={
 contacts:'contacts:read',lists:'contacts:read',
 templates:'transactional.email:read',campaigns:'campaigns.email:read',
};

export type BrevoM2MFailure=
 |'BREVO_M2M_CONFIGURATION_INCOMPLETE'|'BREVO_M2M_SCOPE_DENIED'
 |'BREVO_M2M_TOKEN_UNAUTHORIZED'|'BREVO_M2M_TOKEN_FORBIDDEN'
 |'BREVO_M2M_TOKEN_UNAVAILABLE'|'BREVO_M2M_TOKEN_INVALID';
export class BrevoM2MError extends Error{
 constructor(public readonly code:BrevoM2MFailure){super(code);this.name='BrevoM2MError';}
}

/** A partial M2M configuration is an intentional fail-closed selection:
 * it cannot silently fall back to the existing static API key. */
export function brevoM2MStatus(env:M2MEnv=LIVE_ENV()){
 const id=env.BREVO_M2M_CLIENT_ID?.trim(),secret=env.BREVO_M2M_CLIENT_SECRET?.trim();
 return {selected:Boolean(id||secret),configured:Boolean(id&&secret)};
}
export function brevoM2MReadScope(kind:BrevoReadKind):string{return READ_SCOPES[kind];}

/** One explicitly-scoped client_credentials exchange per native READ.
 * Never cache/log the bearer, provider error payload, client secret or IP.
 * Future WRITE/EXECUTE must pass the existing Autonomy Gate separately.
 */
export async function requestBrevoM2MReadToken(
 kind:BrevoReadKind,
 env:M2MEnv=LIVE_ENV(),
 http:BrevoFetch=fetch,
):Promise<string>{
 const clientId=env.BREVO_M2M_CLIENT_ID?.trim();
 const clientSecret=env.BREVO_M2M_CLIENT_SECRET?.trim();
 if(!clientId||!clientSecret)throw new BrevoM2MError('BREVO_M2M_CONFIGURATION_INCOMPLETE');
 const scope=brevoM2MReadScope(kind);
 if(!scope)throw new BrevoM2MError('BREVO_M2M_SCOPE_DENIED');
 assertRecetteExternalExecutionBlocked('brevo.m2m');
 let response:Response;
 try{
  response=await http(TOKEN_ENDPOINT,{
   method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},
   body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret,scope}),
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15_000),
  });
 }catch{throw new BrevoM2MError('BREVO_M2M_TOKEN_UNAVAILABLE');}
 if(!response.ok){
  if(response.status===401)throw new BrevoM2MError('BREVO_M2M_TOKEN_UNAUTHORIZED');
  if(response.status===403)throw new BrevoM2MError('BREVO_M2M_TOKEN_FORBIDDEN');
  throw new BrevoM2MError('BREVO_M2M_TOKEN_UNAVAILABLE');
 }
 let data:unknown;
 try{data=await response.json();}catch{throw new BrevoM2MError('BREVO_M2M_TOKEN_INVALID');}
 if(!data||typeof data!=='object')throw new BrevoM2MError('BREVO_M2M_TOKEN_INVALID');
 const token=data as Record<string,unknown>;
 const scopes=typeof token.scope==='string'?token.scope.split(/\s+/).filter(Boolean):[];
 if(token.token_type!=='Bearer' || typeof token.access_token!=='string' ||
    token.access_token.length<12 || token.access_token.length>16_384 ||
    !Number.isSafeInteger(token.expires_in)||Number(token.expires_in)<60 ||
    scopes.length!==1||scopes[0]!==scope){
   throw new BrevoM2MError('BREVO_M2M_TOKEN_INVALID');
 }
 return token.access_token;
}
