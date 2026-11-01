"use client";

import {useLocale,useTranslations} from "next-intl";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";

type ClaraContact = {
  revision:string;
  id:string;
  submissionId:string;
  email:string;
  name:string;
  projectType:string;
  lifecycleState:string;
};

export default function ContactsDirectory({ labels }:{labels:Record<string,string>}) {
  const t=useTranslations("ui"),locale=useLocale();
  const [editing,setEditing]=useState<ClaraContact|null>(null),[name,setName]=useState(""),[email,setEmail]=useState(""),[saving,setSaving]=useState(false);
  const generation=useRef(0);
  const [contacts,setContacts]=useState<ClaraContact[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState("");
  const [error,setError]=useState<string|null>(null);

  async function load(q="") {
    const current=++generation.current;setLoading(true); setError(null);
    try {
      const response=await fetch(`/api/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`,{cache:"no-store"});
      const data=await response.json();
      if(current!==generation.current)return;
      setContacts(Array.isArray(data.contacts)?data.contacts:[]);
      if(!response.ok) setError(data.error??labels.loadError);
    } catch { if(current===generation.current)setError(labels.loadError); } finally { if(current===generation.current)setLoading(false); }
  }

  useEffect(()=>{
    const counter=generation,controller=new AbortController(),current=++counter.current;
    void fetch('/api/contacts',{cache:'no-store',signal:controller.signal}).then(async response=>{const data=await response.json();if(current!==generation.current)return;if(!response.ok)throw Error();setContacts(Array.isArray(data.contacts)?data.contacts:[]);}).catch(()=>{if(!controller.signal.aborted&&current===generation.current)setError(labels.loadError);}).finally(()=>{if(!controller.signal.aborted&&current===generation.current)setLoading(false);});
    return()=>{controller.abort();counter.current++;};
  },[labels.loadError]);

  async function save(){
    setSaving(true);setError(null);
    try{const response=await fetch('/api/contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:editing?'update':'create',name,email,locale,...(editing?{submissionId:editing.submissionId,revision:editing.revision}:{})})});const data=await response.json();if(!response.ok){setError(t(data.code==='CONTACT_DRAFT_REVIEW_REQUIRED'?'contactDraftReview':data.code==='CONTACT_REVISION_CONFLICT'||data.code==='NATIVE_REVISION_CONFLICT'?'contactConflict':'contactSaveError'));return;}setEditing(null);setName('');setEmail('');await load(query);}catch{setError(t('contactSaveError'));}finally{setSaving(false);}
  }
  return <div className="native-panel space-y-5">
    <form className="flex flex-wrap gap-3" onSubmit={event=>{event.preventDefault();void save();}}>
      <h2 className="w-full">{t(editing?'contactEdit':'contactCreate')}</h2>
      <label>{t('mailContactName')}<input required maxLength={160} disabled={saving} className="block bg-slate-900 p-2" value={name} onChange={event=>setName(event.target.value)}/></label>
      <label>{t('mailContactEmail')}<input required type="email" maxLength={254} disabled={saving} className="block bg-slate-900 p-2" value={email} onChange={event=>setEmail(event.target.value)}/></label>
      <button disabled={saving} className="border p-2">{t('contactSave')}</button>
      {editing&&<button type="button" disabled={saving} onClick={()=>{setEditing(null);setName('');setEmail('');}}>{t('cancel')}</button>}
    </form>
    <form className="flex flex-wrap gap-3" onSubmit={e=>{e.preventDefault();void load(query)}}>
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4"><Search size={16} className="text-white/35"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={labels.searchPlaceholder} aria-label={labels.searchPlaceholder} className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/30"/></div>
      <button className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 text-sm text-cyan-200">{labels.search}</button>
      <button type="button" onClick={()=>void load(query)} className="rounded-2xl border border-white/10 px-4 text-white/50" aria-label={labels.refresh}><RefreshCw size={16}/></button>
    </form>
    {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4"><span className="flex items-center gap-2 text-sm text-white/60"><Users size={16}/>{labels.directory}</span><span className="text-xs text-white/35">{contacts.length} {labels.contacts}</span></div>
      {loading?<p className="p-8 text-sm text-white/40">{labels.loading}</p>:contacts.length===0?<p className="p-8 text-sm text-white/40">{labels.empty}</p>:<div className="divide-y divide-white/[0.06]">{contacts.map(c=><article id={"contact-"+c.id} data-contact-id={c.id} key={c.id} className="grid gap-2 px-6 py-4 md:grid-cols-[1fr_1.4fr_1fr_auto]"><div><p className="text-sm text-white/80">{c.name||labels.unnamed}</p><details className="mt-2 text-xs text-white/40"><summary>{t("uiTechnicalDetails")}</summary><p>{c.submissionId}</p></details></div><p className="text-sm text-white/55">{c.email}</p><p className="text-sm text-white/45">{c.projectType||"—"}</p><span className="w-fit rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-cyan-200/70">{c.lifecycleState}</span><button type="button" disabled={saving||loading} onClick={()=>{setEditing(c);setName(c.name);setEmail(c.email);}}>{t("contactEdit")}</button></article>)}</div>}
    </div>
  </div>;
}
