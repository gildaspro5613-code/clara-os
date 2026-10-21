'use client';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import type {ClaraConversationMessage} from '@/lib/core/session';
/** Paginate the same Session's durable store; never switch to another thread implicitly. */
export default function NativeEarlierMessages({sessionId,firstMessageId,windowSize}:{sessionId?:string;firstMessageId?:string;windowSize:number}){
 const t=useTranslations('ui'),[messages,setMessages]=useState<ClaraConversationMessage[]>([]),[more,setMore]=useState(windowSize>=100),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 async function load(){
  if(!sessionId||!firstMessageId)return;setBusy(true);setError(false);
  try{
   const params=new URLSearchParams({thread:sessionId,beforeMessageId:messages[0]?.id??firstMessageId,limit:'50'});
   const response=await fetch('/api/clara/conversation?'+params),body=await response.json();
   if(!response.ok||!body.success)throw Error();
   setMessages(current=>{const ids=new Set(current.map(m=>m.id));return [...body.messages.filter((m:ClaraConversationMessage)=>!ids.has(m.id)),...current];});setMore(body.before!==null);
  }catch{setMessages([]);setError(true);}finally{setBusy(false);}
 }
 if(!sessionId)return null;
 return <div>{more&&<button type="button" disabled={busy} onClick={()=>void load()}>{t('nativeEarlierMessages')}</button>}{error&&<p role="alert">{t('nativeHistoryUnavailable')}</p>}
 <ol data-native-earlier-messages>{messages.map(m=><li key={m.id} className="my-2 whitespace-pre-wrap rounded border border-white/10 p-3"><strong>{m.role==='clara'?'Clara':t('user')}</strong><p>{m.content}</p></li>)}</ol></div>;
}
