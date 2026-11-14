import {RegistryError} from '@/lib/canonical/registry';
import {GOOGLE_SCOPES} from '@/lib/native/google-work';

export type GoogleConsentProfile='read'|'agenda'|'drive'|'existing'|'reconnect';

/** Only request Drive on an explicit Drive action. Preserve an existing
 * account's grants when extending them, never silently narrow them. */
export function googleConsentScopes(profile:GoogleConsentProfile,previous?:readonly string[]):string[]{
 if(profile==='reconnect'){
  if(!previous?.includes('openid'))throw new RegistryError(403,'REGISTRY_ACCESS_DENIED');
  return [...new Set(previous)];
 }
 const targeted=profile==='read'?[]:GOOGLE_SCOPES[profile];
 return [...new Set(['openid',...(previous??[]),...targeted])];
}

/** OAuth state already signs and verifies this destination. It is restricted
 * to native business pages and cannot become an external redirect. */
export function googleConsentRedirectPath(profile:GoogleConsentProfile,returnTo?:unknown):'/agenda'|'/documents'{
 if(returnTo!==undefined&&returnTo!=='agenda'&&returnTo!=='drive')throw new RegistryError(400,'GOOGLE_CONSENT_RETURN_INVALID');
 return returnTo==='agenda'||(returnTo===undefined&&profile==='agenda')?'/agenda':'/documents';
}
