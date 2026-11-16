'use client';
import {useEffect,useState} from 'react';
import {useTranslations} from 'next-intl';
import Link from 'next/link';

/** Reuse an already-authorized conversation; never silently create a new one. */
export default function NativeScopeRecovery(){
 const ui=useTranslations('ui');
 const [state,setState]=useState<'checking'|'choose'|'signIn'|'unavailable'>('checking');
 useEffect(()=>{
  const controller=new AbortController();
  async function resume(){
   try{
    const response=await fetch('/api/native/runtime?resume=1',{cache:'no-store',signal:controller.signal});
    const body=await response.json() as {success?:boolean;restored?:boolean};
    if(controller.signal.aborted)return;
    if(response.ok&&body.success&&body.restored){
     // Confirm that the cookie now points to a readable native session.
     // Never reload repeatedly on a rejected or expired selection.
     const verified=await fetch('/api/native/runtime',{cache:'no-store',signal:controller.signal});
     if(controller.signal.aborted)return;
     if(verified.ok){window.location.reload();return;}
    }
    setState(response.status===401?'signIn':response.status>=500?'unavailable':'choose');
   }catch{
    if(!controller.signal.aborted)setState('unavailable');
   }
  }
  void resume();
  return()=>controller.abort();
 },[]);
 if(state==='checking')return <p role="status" className="mt-5 text-sm text-cyan-100">{ui('nativeResumeChecking')}</p>;
 if(state==='signIn')return <a className="mt-5 inline-block rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-cyan-100" href="/api/auth/google/start">{ui('signInWithGoogle')}</a>;
 if(state==='unavailable')return <div role="alert" className="mt-5"><p>{ui('nativeResumeUnavailable')}</p><Link className="mt-3 inline-block underline" href="/">{ui('nativeResumeRetry')}</Link></div>;
 function openExistingThreads(){
  const trigger=document.querySelector<HTMLButtonElement>('[data-open-native-context]');
  const drawer=document.getElementById('clara-navigation');
  if(!trigger)return;
  if(drawer?.inert){
   document.querySelector<HTMLButtonElement>('button[aria-controls="clara-navigation"]')?.click();
   // React first removes the mobile drawer's inert state, then the dialog can open.
   const openWhenReady=(attempts:number)=>{
    if(!drawer.inert){trigger.click();return;}
    if(attempts>0)requestAnimationFrame(()=>openWhenReady(attempts-1));
   };
   requestAnimationFrame(()=>openWhenReady(8));
   return;
  }
  trigger.click();
 }
 return <div className="mt-5"><p className="mb-4 text-sm text-slate-300">{ui('nativeResumeChoose')}</p><button type="button" data-native-resume-open className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-cyan-100" onClick={openExistingThreads}>{ui('nativeResumeOpen')}</button></div>;
}
