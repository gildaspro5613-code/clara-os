'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import {UserRound} from 'lucide-react';
import {accountProfile} from '@/app/actions/account-profile';
import type {AccountProfile} from '@/lib/auth/account-profile';

export default function UserAccountMenu(){
 const t=useTranslations('account'),common=useTranslations('common'),ui=useTranslations('ui'),locale=useLocale(),pathname=usePathname(),id=useId();
 const button=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),generation=useRef(0),lastFocus=useRef(false);
 const [open,setOpen]=useState(false),[profile,setProfile]=useState<AccountProfile|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false),[position,setPosition]=useState({top:72,left:12});
 const positionMenu=useCallback(()=>{const rect=button.current?.getBoundingClientRect();if(rect)setPosition({top:rect.bottom+8,left:Math.max(12,Math.min(rect.right-288,window.innerWidth-300))});},[]);
 function close(){if(panel.current?.matches(':popover-open'))panel.current.hidePopover();}
 useEffect(()=>{const node=panel.current,requests=generation;return()=>{requests.current++;if(node?.matches(':popover-open'))node.hidePopover();};},[pathname]);
 useEffect(()=>{if(!open)return;window.addEventListener('resize',positionMenu);return()=>window.removeEventListener('resize',positionMenu);},[open,positionMenu]);
 async function loadProfile(){const version=++generation.current;setProfile(null);try{const result=await accountProfile();if(version===generation.current)setProfile(result);}catch{if(version===generation.current)setProfile({state:'unavailable'});}}
 async function logout(){
  if(busy||!window.confirm(ui('uiLogoutConfirm')))return;
  setBusy(true);setError(false);
  try{const response=await fetch('/api/auth/session/logout',{method:'POST',credentials:'same-origin'}),result=await response.json();if(!response.ok||result.success!==true)throw Error();close();window.location.replace('/');}
  catch{setError(true);}finally{setBusy(false);}
 }
 return <>
  <button ref={button} type="button" aria-label={common('profile')} title={ui('claraOSProfile')} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} popoverTarget={id}
   onClick={positionMenu} onKeyDown={event=>{if((event.key==='ArrowDown'||event.key==='ArrowUp')&&!open){event.preventDefault();lastFocus.current=event.key==='ArrowUp';event.currentTarget.click();}}}
   className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
   <UserRound size={19} aria-hidden="true" />
  </button>
  <div ref={panel} id={id} popover="auto" role="dialog" aria-label={t('title')} data-account-menu
   style={{position:'fixed',margin:0,bottom:'auto',right:'auto',top:position.top,left:position.left,width:'min(18rem, calc(100vw - 24px))',maxHeight:'calc(100dvh - 88px)',overflowY:'auto'}}
   className="rounded-2xl border border-cyan-300/20 bg-[#08111F] p-4 text-sm text-white shadow-2xl"
   onToggle={event=>{if(event.target!==event.currentTarget)return;const visible=event.currentTarget.matches(':popover-open');setOpen(visible);setError(false);if(visible){void loadProfile();requestAnimationFrame(()=>{const items=panel.current?.querySelectorAll<HTMLElement>('summary,button:not(:disabled),a[href]');(lastFocus.current?items?.[items.length-1]:items?.[0])?.focus();});}else{generation.current++;setProfile(null);lastFocus.current=false;}}}
   onKeyDown={event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;const items=[...event.currentTarget.querySelectorAll<HTMLElement>('summary,button:not(:disabled),a[href]')],at=items.indexOf(document.activeElement as HTMLElement);if(!items.length)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:(at+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next].focus();}}
   onBlur={event=>{if(event.relatedTarget instanceof Node&&!event.currentTarget.contains(event.relatedTarget)&&event.relatedTarget!==button.current)close();}}>
   <details open><summary className="cursor-pointer font-medium text-white">{t('profile')}</summary>
    <p className="mt-2 break-words text-slate-300" data-account-name>{!profile?common('loading'):profile.state==='authenticated'?(profile.displayName??t('authenticatedUser')):t(profile.state==='signed-out'?'signedOut':profile.state==='unverified'?'unverified':'unavailable')}</p>
   </details>
   <details open className="mt-3 border-t border-white/10 pt-3"><summary className="cursor-pointer font-medium text-white">{t('googleAccount')}</summary>
    <p className="mt-2 text-slate-300" data-account-google>{profile?.state==='authenticated'?t(profile.googleIdentityLinked?'googleLinked':'googleNotLinked'):t('googleUnverified')}</p>
    <p className="mt-1 text-xs leading-5 text-slate-400">{t('googleSeparation')}</p>
   </details>
   <button type="button" className="mt-3 block w-full rounded-lg border-t border-white/10 py-2 text-left text-slate-200 focus-visible:outline focus-visible:outline-cyan-200" onClick={()=>{close();button.current?.closest('header')?.querySelector<HTMLSelectElement>('select')?.focus();}}>{t('preferences')} · {common('language')} ({locale.toUpperCase()})</button>
   {profile?.state==='signed-out'&&<a className="mt-2 block text-cyan-200 underline" href="/api/auth/google/start">{t('signIn')}</a>}
   <button type="button" disabled={busy} className="mt-2 block w-full rounded-lg border border-white/20 px-3 py-2 text-left text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-cyan-200" onClick={()=>void logout()}>{busy?common('loading'):common('logout')}</button>
   {error&&<p role="alert" className="mt-2 text-sm text-amber-100">{ui('uiLogoutError')}</p>}
  </div>
 </>;
}
