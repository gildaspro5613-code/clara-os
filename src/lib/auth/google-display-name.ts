/** Presentation only. Never authorizes access or provisions an identity. */
import {encryptCredentialPayload,decryptCredentialPayload} from '@/lib/connections/credential-store';
import {sessionTokenDigest} from './authenticated-workspace-session';
import {authenticatedSessionCookie} from './authenticated-session-lifecycle';
export const GOOGLE_DISPLAY_COOKIE='clara_google_display';
const PURPOSE='clara-google-display-v1';
export function googleGivenName(value:unknown):string|null{
 if(typeof value!=='string')return null;
 const name=value.trim();
 return name.length>0&&name.length<=80&&!/[\u0000-\u001f\u007f<>]/.test(name)?name:null;
}
export function expiredGoogleDisplayCookie(secure:boolean){
 return {name:GOOGLE_DISPLAY_COOKIE,value:'',options:{httpOnly:true,secure,sameSite:'lax' as const,path:'/',maxAge:0}};
}
/** Called only after Google verification, enrolled-user resolution and session issuance. */
export function verifiedGoogleDisplayCookie(token:string,givenName:string|null,secure:boolean,now=Date.now()){
 const name=googleGivenName(givenName),digest=sessionTokenDigest(token);
 if(!name||!digest)return expiredGoogleDisplayCookie(secure);
 const options=authenticatedSessionCookie(token,secure).options;
 try{
  const encrypted=encryptCredentialPayload({purpose:PURPOSE,name,sessionDigest:digest,issuedAt:now,expiresAt:now+options.maxAge*1000});
  return {name:GOOGLE_DISPLAY_COOKIE,value:Buffer.from(encrypted).toString('base64url'),options};
 }catch{return expiredGoogleDisplayCookie(secure);} // Missing display key never changes authentication rights.
}
/** Caller must first resolve the actual native session and active membership. */
export function readGoogleDisplayName(cookieHeader:string|null,authorizedSessionDigest:string,now=Date.now()):string|null{
 const matches=(cookieHeader??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(GOOGLE_DISPLAY_COOKIE+'='));
 if(matches.length!==1||!/^[a-f0-9]{64}$/.test(authorizedSessionDigest))return null;
 const encoded=matches[0].slice(GOOGLE_DISPLAY_COOKIE.length+1);
 if(!/^[A-Za-z0-9_-]{1,2048}$/.test(encoded))return null;
 try{
  const p=decryptCredentialPayload<{purpose:string;name:unknown;sessionDigest:string;issuedAt:number;expiresAt:number}>(Buffer.from(encoded,'base64url').toString('utf8'));
  if(p.purpose!==PURPOSE||p.sessionDigest!==authorizedSessionDigest||!Number.isFinite(p.issuedAt)||!Number.isFinite(p.expiresAt)||p.issuedAt>now||p.expiresAt<=now||p.expiresAt-p.issuedAt>12*60*60*1000)return null;
  return googleGivenName(p.name);
 }catch{return null;}
}
