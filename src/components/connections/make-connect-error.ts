/** Never pass upstream error text, credentials or provider responses into the UI. */
export type MakeConnectFailure={
 kind:'input'|'http'|'network'|'response';status:number|null;code:string|null;
};
export function safeMakeConnectCode(value:unknown):string|null{
 if(typeof value!=='string'||value.length>64)return null;
 return /^(?:MAKE|NATIVE|REGISTRY)_[A-Z0-9_]{3,60}$/.test(value)||
  ['AUTHENTICATED_OS_SESSION_REQUIRED','EXPLICIT_NATIVE_SCOPE_REQUIRED','INVALID_REGISTRY_REQUEST'].includes(value)?
  value:null;
}
export function makeHttpConnectFailure(status:number,payload:unknown):MakeConnectFailure{
 const body=payload&&typeof payload==='object'&&!Array.isArray(payload)?
  payload as Record<string,unknown>:null;
 return {kind:'http',status:status>=100&&status<=599?status:null,code:safeMakeConnectCode(body?.code)};
}
