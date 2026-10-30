'use client';

import {useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';

export interface NativeConversationListProps {
  scope:{workspaceId:string;clientId:string;projectId:string;sessionId:string};
  sessions:{sessionId:string;updatedAt:string}[];
}
/** Selection uses the existing authenticated command; no history is copied. */
export default function NativeConversationList({scope,sessions}:NativeConversationListProps){
  const t=useTranslations('ui'),locale=useLocale();
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  async function select(sessionId:string){
    if(busy)return;
    setBusy(true);setError(false);
    try{
      const response=await fetch('/api/native/runtime',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'selectSession',workspaceId:scope.workspaceId,clientId:scope.clientId,projectId:scope.projectId,sessionId})});
      const result=await response.json();
      if(!response.ok||!result.success)throw Error();
      location.assign('/conversations');
    }catch{setError(true);setBusy(false);}
  }
  return <nav aria-label={t('uiAuthorizedConversations')} className="mb-5">
    <h2 className="mb-3 text-sm font-medium text-white/80">{t('uiAuthorizedConversations')}</h2>
    <ul className="flex max-h-64 flex-wrap gap-2 overflow-auto">
      {sessions.map(item=><li key={item.sessionId}><button data-conversation-id={item.sessionId} type="button" disabled={busy} onClick={()=>void select(item.sessionId)} aria-current={item.sessionId===scope.sessionId?'page':undefined} className="rounded-xl border border-white/15 px-3 py-2 text-sm text-cyan-100 disabled:opacity-50 aria-[current=page]:border-cyan-300">
        {item.sessionId===scope.sessionId?t('uiCurrentThread'):new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.updatedAt))}
      </button></li>)}
    </ul>
    {error&&<p role="alert" className="mt-2 text-sm text-amber-100">{t('nativeSelectionError')}</p>}
  </nav>;
}
