'use client';
import {documentDiagnostic} from '@/lib/documents/document-read-error';
import {readNativeDocument} from '@/lib/documents/native-read-request';
import type {NativeDocumentAnalysis} from '@/lib/native/documents';
import NativeGoogleWorkPanel from './NativeGoogleWorkPanel';
import {canRequestAgendaConsentOnExisting,hasRecordedAgendaConsent,preventAccidentalAgendaConnection} from '@/lib/native/google-existing-consent-ui';
import {useEffect,useState,useCallback} from 'react';
import {useTranslations,useLocale} from 'next-intl';
type Connection={id:string;status:string;owned:boolean;scopes?:string[]};
type Reference={fileId:string;name?:string;version?:string;available:boolean;analysis?:NativeDocumentAnalysis};
export default function NativeDocumentsPanel({referencesOnly=false,workspaceMode='drive'}:{referencesOnly?:boolean;workspaceMode?:'agenda'|'drive'}){
 const t=useTranslations('ui'),locale=useLocale();const [connections,setConnections]=useState<Connection[]>([]),[connectionId,setConnection]=useState(''),[references,setReferences]=useState<Reference[]>([]),[fileId,setFile]=useState(''),[review,setReview]=useState<{id:string;name:string;version:string}|null>(null),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[delegate,setDelegate]=useState('');
 const [selectedActiveId,setSelectedActiveId]=useState('');
 const [advancedOpen,setAdvancedOpen]=useState(workspaceMode==='agenda');
 const googleMessage=useCallback((body:unknown,status:number)=>{const code=documentDiagnostic(body);return t(code==='NATIVE_GOOGLE_REAUTH_REQUIRED'||code==='GOOGLE_REAUTH_REQUIRED'?'googleReconnectHelp':status===401?'googleConnectionSignIn':status===403?'googleConnectionDenied':'googleConnectionUnavailable');},[t]);
 useEffect(()=>{let active=true;void fetch('/api/connections/google',{cache:'no-store'}).then(async r=>({status:r.status,body:await r.json()})).then(async({status,body:b})=>{if(!active)return;if(!b.success){setMessage(googleMessage(b,status));return;}setConnections(b.connections);setConnection(b.selectedConnectionId??'');setSelectedActiveId(b.selectedConnectionId??'');if(b.selectedConnectionId&&workspaceMode==='drive'&&b.connections.some((c:Connection)=>c.id===b.selectedConnectionId&&c.status==='ACTIVE')){const r=await fetch('/api/documents?action=references',{cache:'no-store'}),d=await r.json();if(active&&r.ok&&d.success)setReferences(d.references);else if(active)setMessage(t('nativeProviderBlocked')+' ['+documentDiagnostic(d)+']');}}).catch(()=>{if(active)setMessage(t('googleConnectionUnavailable'));});return()=>{active=false;};},[t,workspaceMode,googleMessage]);
 async function command(path:string,body:Record<string,unknown>){setBusy(true);setMessage('');try{const r=path==='/api/documents'&&body.action==='read'?await readNativeDocument(String(body.fileId),String(body.question??''),String(body.locale??'fr')):await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),b=await r.json();if(!r.ok||!b.success){setMessage(path.startsWith('/api/connections/google')?googleMessage(b,r.status):t('nativeSelectionError')+' ['+documentDiagnostic(b)+']');return null;}return b;}catch{setMessage(path.startsWith('/api/connections/google')?t('googleConnectionUnavailable'):t('nativeSelectionError')+' [DOCUMENT_REQUEST_FAILED]');return null;}finally{setBusy(false);}}
 async function refresh(){const r=await fetch('/api/documents?action=references',{cache:'no-store'}),b=await r.json();if(r.ok&&b.success)setReferences(b.references);else{setReferences([]);setMessage(t('nativeProviderBlocked')+' ['+documentDiagnostic(b)+']');}}
 const selectedConnection=connections.find(c=>c.id===connectionId),owned=selectedConnection?.owned;
 const reconnectRequired=selectedConnection?.status==='RECONNECT_REQUIRED';
 const existingAgendaConsent=workspaceMode==='agenda'&&canRequestAgendaConsentOnExisting(selectedConnection);
 const preventNewAgendaConnection=preventAccidentalAgendaConnection(workspaceMode,connections.length,connectionId);
 return <section id="native-google-document-authority" aria-label={t('nativeDocuments')} className="native-panel my-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-white">
 {(workspaceMode==='agenda'||references.length>0)&&<h2 className="mb-3 font-semibold">{t(workspaceMode==='agenda'?'googleAgendaWork':'documentClaraAnalysis')}</h2>}
 {workspaceMode==='agenda'&&<p className="mb-3 text-white/65">{t('googleSelectionThread')}</p>}
 {!referencesOnly&&workspaceMode==='drive'&&references.length>0&&<label className="mt-3 block">{t('nativeDocumentQuestion')} <input className="bg-slate-900" value={question} maxLength={4000} onChange={e=>setQuestion(e.target.value)}/></label>}
 {workspaceMode==='drive'&&references.length>0&&<ul className="mt-3 space-y-3">{references.map(ref=><li key={ref.fileId+":"+ref.version} data-native-document={ref.fileId}><p>{ref.available?ref.name:ref.fileId} · {ref.available?ref.version:t('nativeProviderBlocked')}</p>{ref.available&&ref.analysis&&<p className="mt-2 whitespace-pre-wrap">{ref.analysis.answer}</p>}
 {ref.available&&ref.analysis?.evidence&&<div data-document-analysis="structured" className="my-3 space-y-2"><p>{t('nativeDocumentUnverified')}</p><h3>{t('nativeDocumentFacts')}</h3><ul>{ref.analysis.evidence.structured.facts.map((fact,i)=><li key={i}>{fact.property}: {String(fact.value)} {fact.unit??''} · {fact.locator}{fact.ambiguity&&<span> · {fact.ambiguity}</span>}</li>)}</ul><h3>{t('nativeDocumentAmbiguities')}</h3><ul>{ref.analysis.evidence.structured.ambiguities.map((v,i)=><li key={i}>{v}</li>)}</ul><h3>{t('nativeDocumentConflicts')}</h3><ul>{ref.analysis.evidence.structured.conflicts.map((v,i)=><li key={i}>{v}</li>)}</ul></div>}{!referencesOnly&&<button disabled={busy} onClick={async()=>{if(await command('/api/documents',{action:'read',fileId:ref.fileId,question,locale}))await refresh();}}>{t('nativeDocumentAnalyze')}</button>}</li>)}</ul>}

 {!referencesOnly&&<details data-document-workspace-settings className="mt-5 rounded-xl border border-white/10 p-4" open={advancedOpen} onToggle={e=>{if(e.currentTarget===e.target)setAdvancedOpen(e.currentTarget.open);}}>
  <summary className="cursor-pointer text-sm text-cyan-200">{t('documentWorkspaceSettings')}</summary>
  {advancedOpen&&<div className="mt-4 space-y-3">
 {!referencesOnly&&<div className="flex flex-wrap gap-3">
 <label>{t('nativeGoogleConnection')} <select aria-label={t('nativeGoogleConnection')} className="bg-slate-900" value={connectionId} disabled={busy} onChange={e=>{setConnection(e.target.value);setReview(null);setReferences([]);}}><option value="">{t('choose')}</option>{connections.map((c,index)=>{const scopes=c.status==='ACTIVE'&&Array.isArray(c.scopes)?c.scopes:[];const labels=[t('googleAccountNumber',{number:index+1}),t(c.status==='ACTIVE'?'nativeGoogleAuthorityReady':c.status==='RECONNECT_REQUIRED'?'reconnectRequired':'notConnected'),c.id===selectedActiveId?t('googleAccountSelected'):null,hasRecordedAgendaConsent(c)?t('googleAccountAgendaAccess'):c.status==='ACTIVE'?t('googleAccountAgendaMissing'):null,scopes.includes('https://www.googleapis.com/auth/drive')||scopes.includes('https://www.googleapis.com/auth/drive.readonly')?t('googleAccountDriveExtended'):scopes.includes('https://www.googleapis.com/auth/drive.file')?t('googleAccountDriveFiles'):null].filter(Boolean);return <option key={c.id} value={c.id}>{labels.join(' · ')}</option>;})}</select></label>
 <button disabled={busy||!connectionId||selectedConnection?.status!=='ACTIVE'} onClick={async()=>{if(await command('/api/connections/google',{action:'select',connectionId})){location.reload();}}}>{t('nativeGoogleSelect')}</button>
 </div>}
 {existingAgendaConsent&&<div className="mt-3 rounded-xl border border-cyan-300/20 p-3">
  <p role="status" className="mb-2 text-cyan-100">{t('googleExistingAgendaConsentHelp')}</p>
  <button type="button" disabled={busy} onClick={async()=>{const b=await command('/api/connections/google/connect',{connectionId,capability:'agenda',returnTo:'agenda'});if(b?.authorizationUrl)location.assign(b.authorizationUrl);}}>{t('googleExistingAgendaConsentAction')}</button>
 </div>}
 {!referencesOnly&&reconnectRequired&&<div className="mt-3" data-google-reconnect><p role="status" className="text-amber-100">{t(owned?'googleReconnectHelp':'googleReconnectOwnerHelp')}</p>{owned&&<button className="mt-3" disabled={busy} onClick={async()=>{const b=await command('/api/connections/google/connect',{connectionId,capability:'reconnect',returnTo:workspaceMode});if(b?.authorizationUrl)location.assign(b.authorizationUrl);}}>{t('googleReconnectAction')}</button>}</div>}
 {!referencesOnly&&<details className="mt-3" data-document-authority-settings><summary className="cursor-pointer text-cyan-200">{t('documentAuthoritySettings')}</summary><div className="mt-3 flex flex-wrap gap-3">
 <button disabled={busy||Boolean(connectionId&&!owned)||preventNewAgendaConnection} onClick={async()=>{const b=await command('/api/connections/google/connect',connectionId?{connectionId,capability:'reconnect',returnTo:workspaceMode}:{capability:workspaceMode});if(b?.authorizationUrl)location.assign(b.authorizationUrl);}}>{t('nativeGoogleConnect')}</button>
 {preventNewAgendaConnection&&<p role="status">{t('googleExistingConnectionFirst')}</p>}
 {owned&&<><label>{t('nativeDelegateUser')} <input className="bg-slate-900" value={delegate} onChange={e=>setDelegate(e.target.value)}/></label>{(['delegate','revokeDelegation'] as const).map(action=><button key={action} disabled={busy||!delegate} onClick={()=>void command('/api/connections/google',{action,connectionId,userId:delegate})}>{t(action==='delegate'?'nativeDelegate':'nativeRevokeDelegate')}</button>)}<button disabled={busy} onClick={async()=>{if(await command('/api/connections/google',{action:'revoke',connectionId}))location.reload();}}>{t('nativeGoogleRevoke')}</button></>}
 </div>
 {workspaceMode==='drive'&&owned&&<form className="mt-4 flex flex-wrap gap-3" onSubmit={async e=>{e.preventDefault();setReview(null);const b=await command('/api/documents',{action:'inspect',fileId});if(b)setReview(b.file);}}>
 <label>{t('nativeDocumentId')} <input aria-label={t('nativeDocumentId')} required maxLength={400} className="bg-slate-900" value={fileId} onChange={e=>{setFile(e.target.value);setReview(null);}}/></label><button disabled={busy}>{t('nativeDocumentInspect')}</button>
 </form>}
 {review&&<div className="mt-3"><p>{review.name} · {t('nativeDocumentRevision')} {review.version}</p><p>{t('nativeDocumentReviewHelp')}</p><button disabled={busy} onClick={async()=>{if(await command('/api/documents',{action:'bind',fileId:review.id,version:review.version})){setReview(null);location.reload();}}}>{t('nativeDocumentBind')}</button></div>}
 </details>}

 {!referencesOnly&&connectionId&&selectedConnection?.status==='ACTIVE'&&<NativeGoogleWorkPanel key={connectionId+workspaceMode} connectionId={connectionId} mode={workspaceMode} connectionOwned={owned===true}/>}
  </div>}
 </details>}
 {message&&<p role="alert" className="mt-3">{message}</p>}
 </section>;
}
