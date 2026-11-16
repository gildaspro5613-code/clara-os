/** One recent, provider-confirmed Drive folder scoped to one native chat.
 * A stored folder ID is a search hint, never a READ authorization or proof
 * that the requested child exists.
 */
export type MakeDriveFolderScope=Readonly<{
 userId:string;workspaceId:string;clientId:string;projectId:string;sessionId:string;
}>;
export type NativeMakeDriveFolderHint=Readonly<{fileId:string;fileName:string}>;
export type NativeMakeDriveRecentFolder=Readonly<NativeMakeDriveFolderHint&{
 observedAt:string;scope:MakeDriveFolderScope;
}>;
const MAX_FOLDER_AGE_MS=6*60*60*1000;
const driveId=(value:unknown):value is string=>
 typeof value==='string'&&/^[A-Za-z0-9_-]{8,160}$/.test(value);
const name=(value:unknown):value is string=>
 typeof value==='string'&&value.length>0&&value.length<=200&&
 value.trim()===value&&!/[\x00-\x1f\x7f]/.test(value);
const record=(value:unknown):value is Record<string,unknown>=>
 Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.getPrototypeOf(value)===Object.prototype);
const scopeKeys=['userId','workspaceId','clientId','projectId','sessionId'] as const;
const scoped=(a:unknown,b:MakeDriveFolderScope):boolean=>
 record(a)&&scopeKeys.every(k=>typeof a[k]==='string'&&a[k]===b[k]&&b[k].length>0);

/** Called only after the certified connector gateway returned available=true.
 * Never derive this receipt from conversation text or model assertions.
 */
export function confirmedMakeDriveFolderFromRead(
 content:unknown,scope:MakeDriveFolderScope,now:Date=new Date(),
):NativeMakeDriveRecentFolder|null{
 if(typeof content!=='string'||content.length>16000||!scopeKeys.every(k=>
   typeof scope[k]==='string'&&scope[k].length>0))return null;
 try{
  const receipt:unknown=JSON.parse(content);
  if(!record(receipt)||receipt.provider!=='make'||
     receipt.capabilityId!=='make.drive.find'||!record(receipt.results))return null;
  const result=receipt.results;
  if(result.status!=='completed'||result.provider!=='google-drive'||
     result.mimeType!=='application/vnd.google-apps.folder'||
     !driveId(result.fileId)||!name(result.fileName))return null;
  const observedAt=now.toISOString();
  return {fileId:result.fileId,fileName:result.fileName,observedAt,
   scope:{userId:scope.userId,workspaceId:scope.workspaceId,
    clientId:scope.clientId,projectId:scope.projectId,sessionId:scope.sessionId}};
 }catch{return null;}
}

/** Only an explicit child lookup inside the recent folder may reuse its ID.
 * No global search, cross-session memory, supplier replay or permissions.
 */
export function makeDriveFolderHintForRequest(
 stored:unknown,scope:MakeDriveFolderScope,message:string,now:Date=new Date(),
):NativeMakeDriveFolderHint|null{
 if(!record(stored)||!scoped(stored.scope,scope)||
    !driveId(stored.fileId)||!name(stored.fileName)||
    typeof stored.observedAt!=='string'||typeof message!=='string')return null;
 const age=now.getTime()-Date.parse(stored.observedAt);
 if(!Number.isFinite(age)||age<0||age>MAX_FOLDER_AGE_MS)return null;
 // Looking up a child is distinct from looking up the parent again.
 if(!/(?:sous[- ]?dossier|fichier|subfolder|file)/iu.test(message))return null;
 const text=message.normalize('NFC').toLocaleLowerCase();
 const parent=stored.fileName.normalize('NFC').toLocaleLowerCase();
 const index=text.indexOf(parent);
 const before=index<0?'':text.slice(Math.max(0,index-150),index);
 const named=index>=0&&/(?:\bdans\b|\binside\b|\bwithin\b|\bin\b)[^\n]{0,110}\b(?:sous[- ]?)?dossier\b[^\n]{0,60}$/iu.test(before);
 const implicit=/(?:\bdans\b|\binside\b|\bwithin\b|\bin\b)\s+(?:(?:ce|cet|this|the same|le même|ce même)\s+(?:sous[- ]?)?dossier|le\s+(?:sous[- ]?)?dossier\s+que\s+tu\s+viens\s+de\s+(?:retrouver|trouver))/iu.test(text);
 return named||implicit?{fileId:stored.fileId,fileName:stored.fileName}:null;
}
