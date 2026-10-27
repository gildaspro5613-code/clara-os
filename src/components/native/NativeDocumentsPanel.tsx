'use client';
import {documentDiagnostic} from '@/lib/documents/document-read-error';
import {readNativeDocument} from '@/lib/documents/native-read-request';
import type {NativeDocumentAnalysis} from '@/lib/native/documents';
import NativeGoogleWorkPanel from './NativeGoogleWorkPanel';
import {useEffect,useState} from 'react';
import {useTranslations,useLocale} from 'next-intl';
type Connection={id:string;status:string;owned:boolean};
type Reference={fileId:string;name?:string;version?:string;available:boolean;analysis?:NativeDocumentAnalysis};
export default function NativeDocumentsPanel({referencesOnly=false,workspaceMode='drive'}:{referencesOnly?:boolean;workspaceMode?:'agenda'|'drive'}){
 const t=useTranslations('ui'),locale=useLocale();const [connections,setConnections]=useState<Connection[]>([]),[connectionId,setConnection]=useState(''),[references,setReferences]=useState<Reference[]>([]),[fileId,setFile]=useState(''),[review,setReview]=useState<{id:string;name:string;version:string}|null>(null),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[delegate,setDelegate]=useState('');
 useEffect(()=>{let active=true;void fetch('/api/connections/google',{cache:'no-store'}).then(r=>r.json()).then(async b=>{if(!active||!b.success)return;setConnections(b.connections);setConnection(b.selectedConnectionId??'');if(b.selectedConnectionId){const r=await fetch('/api/documents?action=references',{cache:'no-store'}),d=await r.json();if(active&&r.ok&&d.success)setReferences(d.references);else if(active)setMessage(t('nativeProviderBlocked'));}}).catch(()=>{if(active)setMessage(t('nativeSelectionError'));});return()=>{active=false;};},[t]);
 async function command(path:string,body:Record<string,unknown>){setBusy(true);setMessage('');try{const r=path==='/api/documents'&&body.action==='read'?await readNativeDocument(String(body.fileId),String(body.question??''),String(body.locale??'fr')):await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),b=await r.json();if(!r.ok||!b.success){setMessage(t('nativeSelectionError')+' ['+documentDiagnostic(b)+']');return null;}return b;}catch{setMessage(t('nativeSelectionError')+' [DOCUMENT_REQUEST_FAILED]');return null;}finally{setBusy(false);}}
 async function refresh(){const r=await fetch('/api/documents?action=references',{cache:'no-store'}),b=await r.json();if(r.ok&&b.success)setReferences(b.references);else{setReferences([]);setMessage(t('nativeProviderBlocked'));}}
 const owned=connections.find(c=>c.id===connectionId)?.owned;
 return <section id="native-google-document-authority" aria-label={t('nativeDocuments')} className="my-5 rounded-xl border border-white/10 p-4 text-sm text-white">
 <h2 className="mb-3 font-semibold">{t('nativeDocuments')}</h2>
 {!referencesOnly&&<div className="flex flex-wrap gap-3">
 <label>{t('nativeGoogleConnection')} <select aria-label={t('nativeGoogleConnection')} className="bg-slate-900" value={connectionId} disabled={busy} onChange={e=>{setConnection(e.target.value);setReview(null);setReferences([]);}}><option value="">{t('choose')}</option>{connections.map(c=><option key={c.id} value={c.id}>{c.id} · {t(c.status==='ACTIVE'?'nativeGoogleAuthorityReady':c.status==='RECONNECT_REQUIRED'?'reconnectRequired':'notConnected')}</option>)}</select></label>
 <button disabled={busy||!connectionId} onClick={async()=>{if(await command('/api/connections/google',{action:'select',connectionId})){location.reload();}}}>{t('nativeGoogleSelect')}</button>
 </div>}
 {!referencesOnly&&<details className="mt-3" data-document-authority-settings><summary className="cursor-pointer text-cyan-200">{t('documentAuthoritySettings')}</summary><div className="mt-3 flex flex-wrap gap-3">
 <button disabled={busy} onClick={async()=>{const b=await command('/api/connections/google/connect',connectionId?{connectionId}:{});if(b?.authorizationUrl)location.assign(b.authorizationUrl);}}>{t('nativeGoogleConnect')}</button>
 {owned&&<><label>{t('nativeDelegateUser')} <input className="bg-slate-900" value={delegate} onChange={e=>setDelegate(e.target.value)}/></label>{(['delegate','revokeDelegation'] as const).map(action=><button key={action} disabled={busy||!delegate} onClick={()=>void command('/api/connections/google',{action,connectionId,userId:delegate})}>{t(action==='delegate'?'nativeDelegate':'nativeRevokeDelegate')}</button>)}<button disabled={busy} onClick={async()=>{if(await command('/api/connections/google',{action:'revoke',connectionId}))location.reload();}}>{t('nativeGoogleRevoke')}</button></>}
 </div>
 {workspaceMode==='drive'&&owned&&<form className="mt-4 flex flex-wrap gap-3" onSubmit={async e=>{e.preventDefault();setReview(null);const b=await command('/api/documents',{action:'inspect',fileId});if(b)setReview(b.file);}}>
 <label>{t('nativeDocumentId')} <input aria-label={t('nativeDocumentId')} required maxLength={400} className="bg-slate-900" value={fileId} onChange={e=>{setFile(e.target.value);setReview(null);}}/></label><button disabled={busy}>{t('nativeDocumentInspect')}</button>
 </form>}
 {review&&<div className="mt-3"><p>{review.name} · {t('nativeDocumentRevision')} {review.version}</p><p>{t('nativeDocumentReviewHelp')}</p><button disabled={busy} onClick={async()=>{if(await command('/api/documents',{action:'bind',fileId:review.id,version:review.version})){setReview(null);location.reload();}}}>{t('nativeDocumentBind')}</button></div>}
 </details>}
 {!referencesOnly&&workspaceMode==='drive'&&<label className="mt-3 block">{t('nativeDocumentQuestion')} <input className="bg-slate-900" value={question} maxLength={4000} onChange={e=>setQuestion(e.target.value)}/></label>}
 {workspaceMode==='drive'&&<ul className="mt-3 space-y-3">{references.map(ref=><li key={ref.fileId+":"+ref.version} data-native-document={ref.fileId}><p>{ref.available?ref.name:ref.fileId} · {ref.available?ref.version:t('nativeProviderBlocked')}</p>{ref.available&&ref.analysis&&<p className="mt-2 whitespace-pre-wrap">{ref.analysis.answer}</p>}
 {ref.available&&ref.analysis?.evidence&&<div data-document-analysis="structured" className="my-3 space-y-2"><p>{t('nativeDocumentUnverified')}</p><h3>{t('nativeDocumentFacts')}</h3><ul>{ref.analysis.evidence.structured.facts.map((fact,i)=><li key={i}>{fact.property}: {String(fact.value)} {fact.unit??''} · {fact.locator}{fact.ambiguity&&<span> · {fact.ambiguity}</span>}</li>)}</ul><h3>{t('nativeDocumentAmbiguities')}</h3><ul>{ref.analysis.evidence.structured.ambiguities.map((v,i)=><li key={i}>{v}</li>)}</ul><h3>{t('nativeDocumentConflicts')}</h3><ul>{ref.analysis.evidence.structured.conflicts.map((v,i)=><li key={i}>{v}</li>)}</ul></div>}{!referencesOnly&&<button disabled={busy} onClick={async()=>{if(await command('/api/documents',{action:'read',fileId:ref.fileId,question,locale}))await refresh();}}>{t('nativeDocumentAnalyze')}</button>}</li>)}</ul>}
 {!referencesOnly&&connectionId&&<NativeGoogleWorkPanel key={connectionId+workspaceMode} connectionId={connectionId} mode={workspaceMode} connectionOwned={owned===true}/>}
 {message&&<p role="alert" className="mt-3">{message}</p>}
 </section>;
}
