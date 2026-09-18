"use client";

import { useEffect, useState } from "react";
import { Contact, RefreshCw, Search, Users } from "lucide-react";

type BrevoContact = { id:number; email:string; attributes?:Record<string,unknown>; listIds?:number[]; emailBlacklisted?:boolean };
export default function ContactsDirectory({ labels }:{labels:Record<string,string>}) {
  const [contacts,setContacts]=useState<BrevoContact[]>([]);
  const [connected,setConnected]=useState<boolean|null>(null);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState("");
  const [error,setError]=useState<string|null>(null);
  async function load(q="") {
    setLoading(true); setError(null);
    try {
      const response=await fetch(`/api/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`,{cache:"no-store"});
      const data=await response.json();
      setConnected(Boolean(data.connected)); setContacts(Array.isArray(data.contacts)?data.contacts:[]);
      if(!response.ok) setError(data.error??labels.loadError);
    } catch { setError(labels.loadError); } finally { setLoading(false); }
  }
  useEffect(()=>{void load();},[]);
  if(connected===false) return <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-8"><Contact className="text-cyan-300" size={24}/><h2 className="mt-6 text-xl font-medium">{labels.notConnected}</h2><p className="mt-3 text-sm leading-7 text-white/50">{labels.connectBrevo}</p></div>;
  return <div className="space-y-5">
    <form className="flex gap-3" onSubmit={e=>{e.preventDefault();void load(query)}}>
      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4"><Search size={16} className="text-white/35"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={labels.searchPlaceholder} className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/30"/></div>
      <button className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 text-sm text-cyan-200">{labels.search}</button>
      <button type="button" onClick={()=>void load(query)} className="rounded-2xl border border-white/10 px-4 text-white/50" aria-label={labels.refresh}><RefreshCw size={16}/></button>
    </form>
    {error&&<p className="text-sm text-red-300">{error}</p>}
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4"><span className="flex items-center gap-2 text-sm text-white/60"><Users size={16}/>{labels.directory}</span><span className="text-xs text-white/35">{contacts.length} {labels.contacts}</span></div>
      {loading?<p className="p-8 text-sm text-white/40">{labels.loading}</p>:contacts.length===0?<p className="p-8 text-sm text-white/40">{labels.empty}</p>:<div className="divide-y divide-white/[0.06]">{contacts.map(c=>{const first=String(c.attributes?.FIRSTNAME??"");const last=String(c.attributes?.LASTNAME??"");return <div key={c.id} className="grid gap-2 px-6 py-4 md:grid-cols-[1fr_1.4fr_auto]"><div><p className="text-sm text-white/80">{[first,last].filter(Boolean).join(" ")||labels.unnamed}</p><p className="mt-1 text-xs text-white/30">#{c.id}</p></div><p className="text-sm text-white/55">{c.email}</p><p className="text-xs text-white/35">{c.listIds?.length??0} {labels.lists}</p></div>})}</div>}
    </div>
  </div>;
}
