'use client';
import {useEffect,useState} from 'react';
import {useTranslations,useLocale} from 'next-intl';
import type {MailboxCommunicationDraft} from '@/lib/acquisition/mailbox-communication-draft';
type Connection={id:string;address:string;owned:boolean};
type Message={id:string;subject:string;from:string;quarantined:boolean;triage:{priority:'high'|'normal'|'low'|'quarantine';category:string;reason:string;requiresAttention:boolean}};
type OpenMail={subject:string;from:string;text:string;quarantined:boolean;attachments:Array<{id:string;name:string;size:number}>};
type Operation={id:string;state:string};
type Review={from:string;to:string[];subject:string;text:string;attachments:Array<{name:string;sha256:string}>};
export default function NativeMailPanel({referencesOnly=false}:{referencesOnly?:boolean}){
 const t=useTranslations('ui'),locale=useLocale();
 const [connections,setConnections]=useState<Connection[]>([]),[connectionId,setConnection]=useState(''),[folders,setFolders]=useState<string[]>([]),[folder,setFolder]=useState(''),[messages,setMessages]=useState<Message[]>([]),[messageId,setMessage]=useState(''),[opened,setOpened]=useState<OpenMail|null>(null),[draft,setDraft]=useState<MailboxCommunicationDraft|null>(null),[operations,setOperations]=useState<Operation[]>([]),[review,setReview]=useState<{id:string;envelope:Review}|null>(null),[approval,setApproval]=useState<{id:string;token:string}|null>(null),[delegate,setDelegate]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/native/mail',{cache:'no-store'}).then(r=>r.json()).then(b=>{if(active&&b.success)setConnections(b.connections);}).catch(()=>{});return()=>{active=false;};},[]);
 const owned=connections.find(c=>c.id===connectionId)?.owned;
 const [nextCursor,setNextCursor]=useState<string|null>(null);
 const [contactName,setContactName]=useState(''),[contactEmail,setContactEmail]=useState('');
 async function get(action:string,extra:Record<string,string>={}){const r=await fetch('/api/native/mail?'+new URLSearchParams({action,connectionId,...extra}),{cache:'no-store'}),b=await r.json();if(!r.ok||!b.success)throw Error();return b;}
 async function post(action:string,extra:Record<string,unknown>={}){const r=await fetch('/api/native/mail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,connectionId,...extra})}),b=await r.json();if(!r.ok)throw Error();return b;}
 async function perform(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch{setError(t('mailUnavailable'));}finally{setBusy(false);}}
 async function refresh(){
  setMessages([]);setNextCursor(null);setOpened(null);setMessage('');setOperations([]);setDraft(null);
  const [list,ops,d]=await Promise.allSettled([get('messages'),get('operations'),get('draft')]);
  if(list.status==='fulfilled'){setMessages(list.value.messages);setNextCursor(list.value.nextCursor);}
  if(ops.status==='fulfilled')setOperations(ops.value.operations);
  if(d.status==='fulfilled')setDraft(d.value.draft);
  if([list,ops,d].some(r=>r.status==='rejected'))setError(t('mailUnavailable'));
 }
 return <section aria-label={t('mailTitle')} className="my-5 rounded-xl border border-white/10 p-4 text-sm text-white">
 <h2 className="font-semibold">{t('mailTitle')}</h2><p className="my-2 text-white/60">{t('mailIsolation')}</p>
 <label>{t('mailAccount')} <select aria-label={t('mailAccount')} className="bg-slate-900" value={connectionId} disabled={busy} onChange={e=>{setConnection(e.target.value);setNextCursor(null);setFolder('');setFolders([]);setMessages([]);setOpened(null);setMessage('');setDraft(null);setOperations([]);setReview(null);setApproval(null);}}><option value="">{t('choose')}</option>{connections.map(c=><option key={c.id} value={c.id}>{c.address}</option>)}</select></label>
 <button className="m-2 border p-2" disabled={busy||!connectionId} onClick={()=>void perform(refresh)}>{t('mailRefresh')}</button>
 {!referencesOnly&&<>
 <button className="m-2 border p-2" disabled={busy||!connectionId} onClick={()=>void perform(async()=>{setFolders((await get('folders')).folders);})}>{t('mailFolders')}</button>
 <select aria-label={t('mailFolder')} className="bg-slate-900" value={folder} onChange={e=>setFolder(e.target.value)}><option value="">{t('mailFolder')}</option>{folders.map(f=><option key={f}>{f}</option>)}</select>
 <button className="m-2 border p-2" disabled={busy||!owned||!folder} onClick={()=>void perform(async()=>{await post('sync',{folder});await refresh();})}>{t('mailSync')}</button>
 <p className="mt-2">{t('mailContextHelp')}</p>
 <ul>{messages.map(m=><li className="my-2" key={m.id}><span className="mr-2 text-xs" aria-label={t('mailTriage_'+m.triage.priority)}>{t('mailTriage_'+m.triage.priority)}</span><button disabled={busy||m.quarantined} onClick={()=>void perform(async()=>{setOpened((await get('message',{messageId:m.id})).message);setMessage(m.id);setReview(null);setApproval(null);})}>{m.from} · {m.subject}{m.quarantined?' · '+t('mailQuarantine'):''}</button></li>)}</ul>
 {nextCursor&&<button className="m-2 border p-2" disabled={busy} onClick={()=>void perform(async()=>{const page=await get('messages',{beforeId:nextCursor});setMessages(previous=>[...previous,...page.messages.filter((m:Message)=>!previous.some(p=>p.id===m.id))]);setNextCursor(page.nextCursor);})}>{t('mailMore')}</button>}
 {opened&&<article className="my-3 rounded border border-white/10 p-3"><h3>{opened.subject}</h3><pre className="whitespace-pre-wrap">{opened.text}</pre><ul>{opened.attachments.map(a=><li key={a.id}><a href={'/api/native/mail?'+new URLSearchParams({action:'attachment',connectionId,messageId,attachmentId:a.id})}>{a.name} · {a.size}</a></li>)}</ul>
 {<fieldset className="my-3 border p-2"><legend>{t('mailContactReview')}</legend><label>{t('mailContactName')} <input disabled={busy} aria-label={t('mailContactName')} className="bg-slate-900" value={contactName} onChange={e=>setContactName(e.target.value)}/></label><label>{t('mailContactEmail')} <input disabled={busy} aria-label={t('mailContactEmail')} className="bg-slate-900" value={contactEmail} onChange={e=>setContactEmail(e.target.value)}/></label><button disabled={busy||!contactName||!contactEmail} onClick={()=>void perform(async()=>{await post('createContact',{messageId,name:contactName,email:contactEmail,locale});location.reload();})}>{t('mailCreateContact')}</button></fieldset>}
 <button className="m-2 border p-2" disabled={busy} onClick={()=>void perform(async()=>{await post('bind',{messageId});location.reload();})}>{t('mailBind')}</button>
 <button className="m-2 border p-2" disabled={busy} onClick={()=>void perform(async()=>{const d=await post('prepare',{messageId,locale});setDraft(d.draft);setApproval(null);})}>{t('mailPrepare')}</button></article>}
 {draft&&<form onSubmit={e=>{e.preventDefault();void perform(async()=>{setDraft((await post('save',{messageId:draft.messageId,subject:draft.subject,body:draft.body,recipients:draft.recipients,attachmentIds:draft.attachmentIds})).draft);setApproval(null);setReview(null);});}}>
 <p>{t('mailFrom')}: {draft.sender.email} · {t('nativeDocumentRevision')} {draft.revision}</p>
 <label className="block">{t('mailTo')}<input disabled={busy} aria-label={t('mailTo')} className="block w-full bg-slate-900" value={draft.recipients.join(', ')} onChange={e=>{setDraft({...draft,recipients:e.target.value.split(',').map(x=>x.trim())});setApproval(null);}}/></label>
 <label className="block">{t('mailSubject')}<input disabled={busy} aria-label={t('mailSubject')} className="block w-full bg-slate-900" value={draft.subject} onChange={e=>{setDraft({...draft,subject:e.target.value});setApproval(null);}}/></label>
 <label className="block">{t('mailBody')}<textarea disabled={busy} aria-label={t('mailBody')} className="block min-h-32 w-full bg-slate-900" value={draft.body} onChange={e=>{setDraft({...draft,body:e.target.value});setApproval(null);}}/></label>
 {opened?.attachments.map(a=><label key={a.id} className="block"><input disabled={busy} type="checkbox" checked={draft.attachmentIds.includes(a.id)} onChange={e=>{setDraft({...draft,attachmentIds:e.target.checked?[...draft.attachmentIds,a.id]:draft.attachmentIds.filter(id=>id!==a.id)});setApproval(null);}}/>{a.name}</label>)}
 <button className="m-2 border p-2" disabled={busy}>{t('mailSave')}</button>
 <button type="button" className="m-2 border p-2" disabled={busy} onClick={()=>void perform(async()=>{await post('submit');await refresh();setReview(null);setApproval(null);})}>{t('mailSubmit')}</button></form>}
 {owned&&<div className="my-3 flex flex-wrap gap-2"><label>{t('nativeDelegateUser')} <input className="bg-slate-900" value={delegate} onChange={e=>setDelegate(e.target.value)}/></label>{(['delegate','revokeDelegation'] as const).map(action=><button disabled={busy||!delegate} key={action} onClick={()=>void perform(async()=>{await post(action,{userId:delegate});})}>{t(action==='delegate'?'nativeDelegate':'nativeRevokeDelegate')}</button>)}<button disabled={busy} onClick={()=>void perform(async()=>{await post('revoke');location.reload();})}>{t('mailRevoke')}</button></div>}
 </>}
 <ul>{operations.map(op=><li key={op.id} className="my-2"><span>{op.id} · {t('mailState_'+op.state)}</span>{!referencesOnly&&<button className="mx-2 border p-2" disabled={busy||!['pending','approved'].includes(op.state)} onClick={()=>void perform(async()=>{const r=await get('review',{operationId:op.id});setReview({id:op.id,envelope:r.envelope});setApproval(null);})}>{t('mailReview')}</button>}</li>)}</ul>
 {review&&!referencesOnly&&<div className="my-3 border p-3"><p>{t('mailFrom')}: {review.envelope.from}</p><p>{t('mailTo')}: {review.envelope.to.join(', ')}</p><h3>{review.envelope.subject}</h3><pre className="whitespace-pre-wrap">{review.envelope.text}</pre>{review.envelope.attachments.map(a=><p key={a.sha256}>{a.name} · SHA256 {a.sha256}</p>)}<p>{t('mailApprovalHelp')}</p>
 <button className="m-2 border p-2" disabled={busy||!owned} onClick={()=>void perform(async()=>{const b=await post('approve',{operationId:review.id});setApproval({id:review.id,token:b.token});await refresh();})}>{t('mailApprove')}</button>
 <button className="m-2 border p-2" disabled={busy||!owned||approval?.id!==review.id} onClick={()=>void perform(async()=>{const a=approval!;setApproval(null);await post('send',{operationId:a.id,token:a.token});setReview(null);await refresh();})}>{t('mailSend')}</button></div>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
