'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {Download,FilePenLine,FileSearch,FolderOpen,Upload,FilePlus2} from 'lucide-react';

type Mode='import'|'draft'|'revise'|'export';
type Connection={id:string;status:string;owned:boolean};
type Capability={drive:boolean;owned:boolean;canManage:boolean;missionId:string|null;selectedFolderId:string|null};
type Resource={id:string;name:string;kind:string;mimeType?:string};
type Folder={id:string;name:string};
type Review={operationId:string;status:string;reviewHash:string;proposal:{kind:string;name:string;resourceId:string;bytes?:number;sha256?:string;missionId:string};result?:{id:string;name:string;version:string}|null};
type Source={name:string;content:string};
const MAX_UPLOAD=2*1024*1024;
const endpoint='/api/native/google/work';
function bytesBase64(bytes:Uint8Array):string{
 let result='';
 for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(result);
}
function responseCode(value:unknown):string{
 const code=value&&typeof value==='object'&&'code' in value?String(value.code):'DOCUMENT_REQUEST_FAILED';
 return /^[A-Z_]{5,80}$/.test(code)?code:'DOCUMENT_REQUEST_FAILED';
}

export default function NativeDocumentDailyPanel({source,onSaved}:{source?:Source|null;onSaved?:()=>void}){
 const t=useTranslations('documents'),locale=useLocale();
 const [mode,setMode]=useState<Mode>('import');
 const [connectionId,setConnectionId]=useState('');
 const [caps,setCaps]=useState<Capability|null>(null),[resources,setResources]=useState<Resource[]>([]);
 const [folders,setFolders]=useState<Folder[]>([]),[folderPage,setFolderPage]=useState<string|null>(null),[folderPicker,setFolderPicker]=useState(false);
 const [folderSearch,setFolderSearch]=useState(''),[folderShown,setFolderShown]=useState(12);
 const [pendingFolder,setPendingFolder]=useState<Folder|null>(null),[folderError,setFolderError]=useState(''),[folderFeedback,setFolderFeedback]=useState('');
 const folderApprovalRef=useRef<HTMLButtonElement>(null);
 const [folderId,setFolderId]=useState(''),[upload,setUpload]=useState<File|null>(null);
 const [title,setTitle]=useState(''),[instruction,setInstruction]=useState(''),[draft,setDraft]=useState(''),[sourceText,setSourceText]=useState('');
 const [targetId,setTargetId]=useState(''),[originalLoaded,setOriginalLoaded]=useState(false),[review,setReview]=useState<Review|null>(null);
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const [operations,setOperations]=useState<Array<{operationId:string;status:string;kind:string}>>([]);
 const nativeGet=useCallback(async(action:string,params:Record<string,string>={})=>{
  const response=await fetch(endpoint+'?'+new URLSearchParams({connectionId,action,...params}),{cache:'no-store'});
  const body=await response.json();
  if(!response.ok||!body.success)throw Error(responseCode(body));
  return body;
 },[connectionId]);
 const nativePost=useCallback(async(action:string,more:Record<string,unknown>={})=>{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connectionId,action,...more})});
  const body=await response.json();
  if(!response.ok||!body.success)throw Error(responseCode(body));
  return body;
 },[connectionId]);
 const reload=useCallback(async()=>{
  const [c,r,o]=await Promise.all([nativeGet('capabilities'),nativeGet('resources'),nativeGet('operations')]);
  setCaps(c as Capability);setResources(r.resources??[]);setOperations(o.operations??[]);
  setFolderId((current)=>current&&r.resources?.some((item:Resource)=>item.id===current&&item.kind==='folder')
   ?current:c.selectedFolderId??'');
  return {capabilities:c as Capability,resources:(r.resources??[]) as Resource[]};
 },[nativeGet]);
 useEffect(()=>{
  let active=true;
  void fetch('/api/connections/google',{cache:'no-store'}).then(r=>r.json()).then((b:{selectedConnectionId?:string;connections?:Connection[]})=>{
   if(!active)return;
   const selected=b.connections?.find(c=>c.id===b.selectedConnectionId&&c.status==='ACTIVE');
   if(selected)setConnectionId(selected.id);
  }).catch(()=>{if(active)setError(t('workspaceConnectionUnavailable'));});
  return()=>{active=false};
 },[t]);
 useEffect(()=>{if(!connectionId)return;let active=true;
  void reload().catch(()=>{if(active)setError(t('workspaceUnavailable'));});
  return()=>{active=false};
 },[connectionId,reload,t]);
 useEffect(()=>{if(!source?.content)return;
  setMode('draft');setSourceText(source.content.slice(0,24000));
  setTitle(source.name.replace(/\.[^.]+$/,'')+' - revision');
  setInstruction(t('workspaceRevisionInstruction'));
  setDraft('');setReview(null);setConfirm(false);
 },[source?.name,source?.content,t]);
 const writable=Boolean(caps?.drive&&caps.owned&&caps.canManage&&caps.missionId);
 const folderResources=resources.filter(r=>r.kind==='folder');
 const selectedFolder=folderResources.find(r=>r.id===folderId);
 const matchingFolders=folders.filter(f=>f.name.toLocaleLowerCase(locale).includes(folderSearch.trim().toLocaleLowerCase(locale)));
 useEffect(()=>{if(pendingFolder)folderApprovalRef.current?.focus();},[pendingFolder]);
 const textResources=resources.filter(r=>r.kind==='file'&&r.mimeType==='text/plain');
 const selectedTarget=textResources.find(r=>r.id===targetId);
 async function run(task:()=>Promise<void>){
  setBusy(true);setError('');setStatus('');
  try{await task();}catch(e){setError(e instanceof Error?e.message:'DOCUMENT_REQUEST_FAILED');}
  finally{setBusy(false);}
 }
 async function browseFolders(more=false){
  await run(async()=>{
   const response=await nativeGet('folders',more&&folderPage?{pageToken:folderPage}:{});
   setFolders(previous=>{
    const combined:Folder[]=more?[...previous,...(response.folders??[])]:response.folders??[];
    return [...new Map(combined.map(folder=>[folder.id,folder])).values()];
   });
   if(!more){setFolderSearch('');setFolderShown(12);}
   setFolderError('');setFolderFeedback('');
   setFolderPage(response.nextPageToken??null);setFolderPicker(true);
  });
 }
 function selectFolder(folder:Folder){
  if(busy||!writable)return;
  setFolderError('');setPendingFolder(folder);
 }
 async function approveFolder(){
  const folder=pendingFolder;
  if(!folder||busy||!writable)return;
  setBusy(true);setError('');setStatus('');setFolderError('');setFolderFeedback('');
  try{
   if(!resources.some(resource=>resource.kind==='folder'&&resource.id===folder.id)){
    const inspect=await nativePost('inspect',{kind:'folder',resourceId:folder.id});
    if(!inspect.resource?.version)throw Error('GOOGLE_RESOURCE_CHANGED');
    await nativePost('bind',{kind:'folder',resourceId:folder.id,version:inspect.resource.version});
   }
   await nativePost('select',{kind:'folder',resourceId:folder.id});
   const refreshed=await reload();
   if(refreshed.capabilities.selectedFolderId!==folder.id
      ||!refreshed.resources.some(resource=>resource.kind==='folder'&&resource.id===folder.id))
    throw Error('GOOGLE_FOLDER_SELECTION_UNVERIFIED');
   setFolderId(folder.id);setFolderPicker(false);setPendingFolder(null);
   setFolderFeedback(t('workspaceFolderReady',{name:folder.name}));
  }catch(e){setFolderError(e instanceof Error?e.message:'DOCUMENT_REQUEST_FAILED');}
  finally{setBusy(false);}
 }
 async function loadOriginal(fileId:string){
  await run(async()=>{
   setOriginalLoaded(false);setDraft('');setReview(null);setConfirm(false);
   const response=await fetch('/api/documents?'+new URLSearchParams({action:'download',fileId}),{cache:'no-store'});
   if(!response.ok||!response.headers.get('Content-Type')?.startsWith('text/plain'))
    throw Error('NATIVE_DOCUMENT_SCOPE_DENIED');
   const content=new Uint8Array(await response.arrayBuffer());
   if(content.length>MAX_UPLOAD)throw Error('GOOGLE_UPLOAD_LIMIT');
   const text=new TextDecoder('utf-8',{fatal:true}).decode(content);
   setDraft(text);setOriginalLoaded(true);
  });
 }
 async function generateDraft(){
  await run(async()=>{
   if(!title.trim()||!instruction.trim())throw Error('DOCUMENT_DRAFT_INVALID');
   const response=await fetch('/api/native/documents/draft',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({title:title.trim(),instruction:instruction.trim(),sourceText,locale})});
   const body=await response.json();
   if(!response.ok||!body.success)throw Error(responseCode(body));
   if(body.kind!=='unapproved-draft'||body.savedToDrive!==false)throw Error('DOCUMENT_DRAFT_INVALID');
   setDraft(body.content);setReview(null);setConfirm(false);setStatus(t('workspaceDraftReady'));
  });
 }
 async function prepare(){
  await run(async()=>{
   if(!writable||!selectedFolder)throw Error('GOOGLE_RESOURCE_DENIED');
   let kind:'drive.upload'|'drive.create'|'drive.update';
   let name='',mimeType='text/plain',bytes:Uint8Array;
   if(mode==='import'){
    if(!upload||upload.size>MAX_UPLOAD)throw Error('GOOGLE_UPLOAD_LIMIT');
    kind='drive.upload';name=upload.name;mimeType=upload.type||'application/octet-stream';
    bytes=new Uint8Array(await upload.arrayBuffer());
   }else{
    if(!title.trim()||!draft.trim())throw Error('DOCUMENT_DRAFT_INVALID');
    bytes=new TextEncoder().encode(draft);
    if(bytes.length>MAX_UPLOAD)throw Error('GOOGLE_UPLOAD_LIMIT');
    name=(mode==='revise'&&selectedTarget?selectedTarget.name:title.trim().endsWith('.txt')?title.trim():title.trim()+'.txt');
    kind=mode==='revise'?'drive.update':'drive.create';
    if(mode==='revise'&&(!selectedTarget||!originalLoaded))throw Error('GOOGLE_RESOURCE_DENIED');
   }
   const input={operationId:crypto.randomUUID(),kind,resourceId:selectedFolder.id,name,
    content:bytesBase64(bytes),mimeType,...(kind==='drive.update'?{fileId:selectedTarget?.id}:{})};
   const proposed=await nativePost('prepare',{input});
   setReview(proposed);setConfirm(false);setStatus(t('workspaceReviewRequired'));
   await reload();
  });
 }
 async function executeReview(){
  if(!review||!confirm)return;
  await run(async()=>{
   // Exactly one user-confirmed execution. Unknown outcomes are never retried.
   const completed=await nativePost('execute',{operationId:review.operationId,reviewHash:review.reviewHash,confirm:true});
   setReview(completed);setConfirm(false);
   if(completed.status==='completed'){setStatus(t('workspaceSaved'));await reload();onSaved?.();}
   else setStatus(t('workspaceUncertain'));
  });
 }
 async function cancelReview(){
  if(!review||review.status!=='queued')return;
  await run(async()=>{await nativePost('cancel',{operationId:review.operationId});setReview(null);setConfirm(false);await reload();});
 }
 async function retrieveReview(operationId:string){
  await run(async()=>{const result=await nativeGet('review',{operationId});setReview(result);setConfirm(false);});
 }
 function downloadDraft(){
  if(!draft.trim())return;
  const url=URL.createObjectURL(new Blob([draft],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=(title.trim()||'Document').replace(/[\\/]/g,'_')+'.txt';
  document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const tabClass=(active:boolean)=>'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition '+(active?'border-cyan-300/35 bg-cyan-300/[0.09] text-cyan-100':'border-white/10 text-slate-300 hover:bg-white/[0.04]');
 return <section data-document-daily aria-label={t('workspaceTitle')} className="mb-7 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
  <h2 className="text-lg font-semibold text-white">{t('workspaceTitle')}</h2>
  <p className="mt-1 text-sm text-slate-400">{t('workspaceIntro')}</p>
  <div className="mt-5 flex flex-wrap gap-2">
   <button type="button" className={tabClass(mode==='import')} onClick={()=>{setMode('import');setReview(null);}}><Upload size={16}/>{t('workspaceImport')}</button>
   <button type="button" className={tabClass(mode==='draft')} onClick={()=>{setMode('draft');setReview(null);}}><FilePlus2 size={16}/>{t('workspaceDraft')}</button>
   <button type="button" className={tabClass(mode==='revise')} onClick={()=>{setMode('revise');setReview(null);}}><FilePenLine size={16}/>{t('workspaceRevise')}</button>
   <button type="button" className={tabClass(mode==='export')} onClick={()=>{setMode('export');setReview(null);}}><Download size={16}/>{t('workspaceExport')}</button>
  </div>
  {!connectionId&&<p role="status" className="mt-5 text-amber-200/90">{t('workspaceConnectionUnavailable')}</p>}
  {connectionId&&!caps?.missionId&&<p role="status" className="mt-5 text-amber-200/90">{t('workspaceMissionRequired')}</p>}
  {mode!=='export'&&<div className="mt-5 space-y-4">
   {mode!=='import'&&<>
    <label className="block text-sm text-slate-300">{t('workspaceTitleLabel')}
     <input maxLength={150} value={title} onChange={e=>{setTitle(e.target.value);setReview(null);setConfirm(false);}}
      className="mt-1.5 block h-11 w-full rounded-xl border border-white/10 bg-[#0a1528] px-4 outline-none focus:border-cyan-300/40"/>
    </label>
    {mode==='draft'&&<>
     <label className="block text-sm text-slate-300">{t('workspaceInstruction')}
      <textarea rows={3} maxLength={4000} value={instruction} onChange={e=>{setInstruction(e.target.value);setReview(null);setConfirm(false);}}
       className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a1528] p-4 outline-none focus:border-cyan-300/40"/>
     </label>
     <button type="button" disabled={busy||!title.trim()||!instruction.trim()} onClick={()=>void generateDraft()}
      className="rounded-xl border border-cyan-300/25 px-4 py-2.5 text-sm text-cyan-100 disabled:opacity-40">{t('workspaceAskClara')}</button>
     {sourceText&&<p className="text-xs text-slate-400">{t('workspaceSourceNotice')}</p>}
    </>}
    {mode==='revise'&&<label className="block text-sm text-slate-300">{t('workspaceEditableFile')}
      <select value={targetId} onChange={e=>{setTargetId(e.target.value);setDraft('');setReview(null);setConfirm(false);setOriginalLoaded(false);setTitle(textResources.find(x=>x.id===e.target.value)?.name??'');if(e.target.value)void loadOriginal(e.target.value);}}
       className="mt-1.5 block h-11 w-full rounded-xl border border-white/10 bg-[#0a1528] px-3">
       <option value="">{t('workspaceChoose')}</option>{textResources.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
     </label>}
    <label className="block text-sm text-slate-300">{t('workspaceDraftContent')}
     <textarea rows={8} maxLength={100000} value={draft} onChange={e=>{setDraft(e.target.value);setReview(null);setConfirm(false);}}
      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0a1528] p-4 text-sm leading-6 outline-none focus:border-cyan-300/40"/>
    </label>
    <p className="text-xs text-slate-400">{t('workspaceDraftWarning')}</p>
    <button type="button" disabled={!draft.trim()} onClick={downloadDraft}
     className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-40"><Download size={15}/>{t('workspaceDownloadText')}</button>
   </>}
   {mode==='import'&&<label className="block text-sm text-slate-300">{t('workspaceLocalFile')}
    <input type="file" className="mt-2 block w-full text-sm" onChange={e=>{setUpload(e.target.files?.[0]??null);setReview(null);setConfirm(false);}}/>
    <span className="mt-2 block text-xs text-slate-400">{t('workspaceImportLimit')}</span>
   </label>}
   <div className="space-y-3 rounded-xl border border-white/10 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <p className="text-sm text-slate-300"><FolderOpen size={16} className="mr-2 inline"/>{t('workspaceFolder')}: <strong className="text-white">{selectedFolder?.name??t('workspaceNoFolder')}</strong></p>
     <button type="button" disabled={busy||!writable} onClick={()=>void browseFolders()}
      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-cyan-100 disabled:opacity-40">{t('workspaceChooseFolder')}</button>
    </div>
    {folderFeedback&&<p role="status" className="text-sm text-cyan-200">{folderFeedback}</p>}
    {folderPicker&&<div className="space-y-2">
     <input type="search" aria-label={t('workspaceSearchFolder')} placeholder={t('workspaceSearchFolder')}
      value={folderSearch} onChange={e=>{setFolderSearch(e.target.value);setFolderShown(12);}}
      className="w-full rounded-lg border border-white/10 bg-[#0a1528] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"/>
     <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
      {matchingFolders.slice(0,folderShown).map(f=><button type="button" key={f.id} disabled={busy} onClick={()=>selectFolder(f)}
       className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-200 disabled:opacity-40">
       <span>{f.name}{folders.some(other=>other.id!==f.id&&other.name===f.name)&&
        <span className="ml-2 text-xs text-slate-400">· …{f.id.slice(-6)}</span>}</span>
       <span className="shrink-0 text-cyan-200">{t('workspaceUseFolder')}</span></button>)}
     </div>
     {matchingFolders.length>folderShown&&<button type="button" disabled={busy} onClick={()=>setFolderShown(n=>n+12)}
       className="rounded-lg border border-white/10 px-3 py-2 text-sm">{t('workspaceShowMoreFolders')}</button>}
     {folderPage&&<button type="button" disabled={busy} onClick={()=>void browseFolders(true)}
       className="rounded-lg border border-white/10 px-3 py-2 text-sm">{t('workspaceMoreFolders')}</button>}
     {matchingFolders.length===0&&<p className="text-sm text-slate-400">{t('workspaceNoFolderCandidates')}</p>}
    </div>}
   </div>
   <button type="button" disabled={busy||!writable||!selectedFolder||Boolean(review&&review.status==='queued')||(mode==='import'?!upload||upload.size>MAX_UPLOAD:!draft.trim()||mode==='revise'&&(!selectedTarget||!originalLoaded))}
    onClick={()=>void prepare()}
    className="rounded-xl border border-cyan-300/30 bg-cyan-300/[0.09] px-5 py-3 text-sm font-medium text-cyan-100 disabled:opacity-40">{t('workspacePrepare')}</button>
  </div>}
  {mode==='export'&&<p className="mt-5 flex items-center gap-2 text-sm text-slate-300"><FileSearch size={17}/>{t('workspaceExportHelp')}</p>}
  {!writable&&connectionId&&<p className="mt-3 text-xs text-slate-400">{t('workspaceApprovalRequired')}</p>}
  {operations.filter(o=>['queued','uncertain','processing'].includes(o.status)).length>0&&<div className="mt-5">
   <p className="mb-2 text-xs text-slate-400">{t('workspacePending')}</p>
   <div className="flex flex-wrap gap-2">{operations.filter(o=>['queued','uncertain','processing'].includes(o.status)).slice(0,5).map(o=>
    <button type="button" disabled={busy} key={o.operationId} onClick={()=>void retrieveReview(o.operationId)}
     className="rounded-lg border border-white/10 px-3 py-2 text-xs">{o.kind} · {o.status}</button>)}</div>
  </div>}
  {review&&<article aria-label={t('workspaceReview')} className="mt-5 space-y-3 rounded-xl border border-cyan-300/20 bg-[#0c1828] p-5">
   <h3 className="font-semibold text-white">{t('workspaceReview')}</h3>
   <p className="text-sm text-slate-200">{review.proposal.name}</p>
   <p className="text-xs text-slate-400">{t('workspaceTarget')}: {selectedFolder?.name??review.proposal.resourceId} · {review.status}</p>
   {review.proposal.bytes!==undefined&&<p className="text-xs text-slate-400">{review.proposal.bytes} octets · SHA256 {review.proposal.sha256}</p>}
   {review.proposal.bytes!==undefined&&<a className="inline-block text-sm text-cyan-200 underline" href={endpoint+'?'+new URLSearchParams({connectionId,action:'proposalFile',operationId:review.operationId})}>{t('workspaceDownloadProposal')}</a>}
   {review.status==='queued'&&<>
    <label className="flex items-center gap-3 text-sm text-slate-200"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>{t('workspaceExactApproval')}</label>
    <div className="flex flex-wrap gap-2">
     <button type="button" disabled={busy||!confirm||!writable} onClick={()=>void executeReview()} className="rounded-xl bg-cyan-800 px-4 py-2.5 text-sm text-white disabled:opacity-40">{t('workspaceExecute')}</button>
     <button type="button" disabled={busy} onClick={()=>void cancelReview()} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm">{t('workspaceCancel')}</button>
    </div>
   </>}
   {['processing','uncertain'].includes(review.status)&&<p className="text-sm text-amber-200">{t('workspaceUncertain')}</p>}
  </article>}
  {status&&<p role="status" className="mt-4 text-sm text-cyan-100">{status}</p>}
  {error&&<p role="alert" className="mt-4 text-sm text-amber-200">{t('workspaceFailed')} [{error}]</p>}
  {pendingFolder&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4"
    onKeyDown={event=>{if(event.key==='Escape'&&!busy)setPendingFolder(null);}}>
   <div role="dialog" aria-modal="true" aria-label={t('workspaceConfirmFolder',{name:pendingFolder.name})}
    className="w-full max-w-lg rounded-2xl border border-cyan-300/20 bg-[#101d30] p-6 shadow-2xl">
    <h3 className="text-lg font-semibold text-white">{t('workspaceChooseFolder')}</h3>
    <p className="mt-3 break-words text-sm text-slate-200">{t('workspaceConfirmFolder',{name:pendingFolder.name})}</p>
    {folderError&&<p role="alert" className="mt-4 text-sm text-amber-200">{t('workspaceFailed')} [{folderError}]</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-2">
     <button type="button" disabled={busy} onClick={()=>setPendingFolder(null)}
      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 disabled:opacity-40">{t('workspaceCancelFolder')}</button>
     <button type="button" ref={folderApprovalRef} disabled={busy||!writable} onClick={()=>void approveFolder()}
      className="rounded-xl border border-cyan-300/30 bg-cyan-900/40 px-4 py-2 text-sm text-cyan-100 disabled:opacity-40">
      {busy?t('workspaceFolderChecking'):t('workspaceUseFolder')}</button>
    </div>
   </div>
  </div>}
 </section>;
}
