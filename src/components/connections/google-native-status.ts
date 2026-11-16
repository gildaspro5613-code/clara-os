/** Presentation of the existing native list, never a provider/authority probe. */
export type NativeGoogleHubState = 'selected' | 'selectionRequired' | 'selectionUnavailable' | 'reconnect' | 'pending' | 'none' | 'authRequired' | 'denied' | 'unavailable';
type Row = {id:string;status:'ACTIVE'|'RECONNECT_REQUIRED'|'PENDING_AUTHENTICATION';owned:boolean};
export function nativeGoogleHubState(value:unknown,httpStatus:number):NativeGoogleHubState {
  const body=value&&typeof value==='object'?value as Record<string,unknown>:null;
  const code=typeof body?.code==='string'?body.code:'';
  if(!Number.isInteger(httpStatus))return 'unavailable';
  if(httpStatus===401||body?.code==='AUTHENTICATED_OS_SESSION_REQUIRED')return 'authRequired';
  if(httpStatus===403)return 'denied';
  if(httpStatus<200||httpStatus>=300||!body||body.success!==true){
    return ['NATIVE_SCOPE_DENIED','NATIVE_GOOGLE_SCOPE_DENIED','NATIVE_GOOGLE_OWNER_SCOPE_DENIED'].includes(code)?'denied':'unavailable';
  }
  if(!Array.isArray(body.connections)||(body.selectedConnectionId!==null&&(typeof body.selectedConnectionId!=='string'||!body.selectedConnectionId)))return 'unavailable';
  const rows=body.connections;
  if(!rows.every(r=>r&&typeof r==='object'&&typeof r.id==='string'&&r.id.length>0&&typeof r.owned==='boolean'&&['ACTIVE','RECONNECT_REQUIRED','PENDING_AUTHENTICATION'].includes(r.status))||new Set(rows.map(r=>r.id)).size!==rows.length)return 'unavailable';
  const connections=rows as Row[];
  const selected=connections.find(r=>r.id===body.selectedConnectionId);
  if(body.selectedConnectionId&&!selected)return 'selectionUnavailable';
  if(selected)return selected.status==='ACTIVE'?'selected':selected.status==='RECONNECT_REQUIRED'?'reconnect':'pending';
  if(connections.some(r=>r.status==='ACTIVE'))return 'selectionRequired';
  if(connections.some(r=>r.status==='RECONNECT_REQUIRED'))return 'reconnect';
  return connections.length?'pending':'none';
}
