'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Search} from 'lucide-react';
import {headerSearch} from '@/app/actions/header-search';
import type {SearchHit} from '@/lib/native/search-view';
type Kind='missions'|'conversations'|'contacts'|'documents'|'journal';
type Group={state:'loading'|'ready'|'denied'|'unavailable';hits:SearchHit[]};
const kinds:Kind[]=['missions','conversations','contacts','documents','journal'];
const all=(state:Group['state']):Record<Kind,Group>=>({missions:{state,hits:[]},conversations:{state,hits:[]},contacts:{state,hits:[]},documents:{state,hits:[]},journal:{state,hits:[]}});
export default function HeaderSearch(){
 const t=useTranslations('headerSearch'),id=useId(),pathname=usePathname();
 const panel=useRef<HTMLDivElement>(null),container=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLInputElement>(null),mobile=useRef<HTMLButtonElement>(null),generation=useRef(0);
 const [requestVersion,setRequestVersion]=useState(0);
 const [open,setOpen]=useState(false),[text,setText]=useState(''),[groups,setGroups]=useState(all('loading')),[position,setPosition]=useState({left:12,top:72});
 const locate=useCallback(()=>{const rect=container.current?.getBoundingClientRect();if(rect)setPosition({left:Math.max(12,Math.min(rect.left,innerWidth-Math.min(608,innerWidth-24)-12)),top:rect.bottom+8});},[]);
 const show=useCallback(()=>{generation.current++;setGroups(all('loading'));setRequestVersion(v=>v+1);locate();if(!panel.current?.matches(':popover-open'))panel.current?.showPopover();else input.current?.focus();},[locate]);
 function close(){generation.current++;setOpen(false);setGroups(all('loading'));panel.current?.hidePopover();}
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();show();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[show]);
 useEffect(()=>{const node=panel.current,version=generation;return()=>{version.current++;if(node?.matches(':popover-open'))node.hidePopover();};},[pathname]);
 useEffect(()=>{if(!open)return;window.addEventListener('resize',locate);return()=>window.removeEventListener('resize',locate);},[open,locate]);
 useEffect(()=>{
  const version=++generation.current,controller=new AbortController();
  if(!open||!text.trim())return()=>controller.abort();
  const update=(key:Kind,value:Group)=>{if(version===generation.current&&!controller.signal.aborted)setGroups(previous=>({...previous,[key]:value}));};
  const timer=setTimeout(()=>{
   void headerSearch(text).then(result=>{if(version!==generation.current||controller.signal.aborted)return;if(result.state==='denied'){setGroups(all('denied'));controller.abort();return;}for(const key of kinds.filter(k=>k!=='documents'))update(key,{state:result.state==='ready'?'ready':'unavailable',hits:result.state==='ready'?result.groups[key as keyof typeof result.groups]:[]});}).catch(()=>{for(const key of kinds.filter(k=>k!=='documents'))update(key,{state:'unavailable',hits:[]});});
   void fetch('/api/documents?query='+encodeURIComponent(text.trim()),{cache:'no-store',credentials:'same-origin',signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok||data.success!==true||!Array.isArray(data.files)){update('documents',{state:[401,403].includes(response.status)?'denied':'unavailable',hits:[]});return;}update('documents',{state:'ready',hits:data.files.filter((f:{id?:unknown;name?:unknown})=>typeof f.id==='string'&&typeof f.name==='string').slice(0,8).map((f:{id:string;name:string})=>({label:f.name,href:'/api/documents?action=download&fileId='+encodeURIComponent(f.id)}))});}).catch(()=>update('documents',{state:'unavailable',hits:[]}));
  },200);
  return()=>{clearTimeout(timer);controller.abort();};
 },[open,text,requestVersion]);
 const change=(value:string)=>{setText(value);show();};
 return <div ref={container} className="mx-2 flex min-w-0 flex-1 justify-center md:mx-5 xl:mx-8">
  <div className="hidden min-h-10 w-full max-w-2xl min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-300 md:flex"><Search size={18} className="shrink-0 text-cyan-300" aria-hidden="true"/><input ref={trigger} type="search" maxLength={160} value={text} onChange={e=>change(e.target.value)} onClick={show} onKeyDown={e=>{if(e.key==='Enter'||e.key==='ArrowDown'){e.preventDefault();show();}}} role="combobox" aria-haspopup="dialog" aria-autocomplete="none" aria-label={t('label')} placeholder={t('placeholder')} aria-controls={id} aria-expanded={open} className="min-w-0 flex-1 bg-transparent py-2 text-white outline-none placeholder:text-slate-400"/><span className="text-xs text-slate-400" aria-hidden="true">⌘K / Ctrl K</span></div>
  <button ref={mobile} type="button" onClick={show} aria-label={t('label')} aria-controls={id} aria-expanded={open} className="rounded-lg p-2 text-cyan-300 hover:bg-white/5 md:hidden"><Search size={19} aria-hidden="true"/></button>
  <div ref={panel} id={id} popover="auto" role="dialog" aria-label={t('label')} data-header-search style={{position:'fixed',margin:0,right:'auto',bottom:'auto',left:position.left,top:position.top,width:'min(38rem, calc(100vw - 24px))',maxHeight:'calc(100dvh - 88px)',overflowY:'auto'}} className="rounded-2xl border border-cyan-300/20 bg-[#08111F] p-4 text-sm text-white shadow-2xl"
   onToggle={event=>{if(event.target!==event.currentTarget)return;const visible=event.currentTarget.matches(':popover-open');setOpen(visible);if(visible)requestAnimationFrame(()=>input.current?.focus());else{generation.current++;setGroups(all('loading'));}}}
   onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close();(trigger.current?.offsetParent?trigger.current:mobile.current)?.focus();return;}if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||event.key==='Home'&&event.target===input.current||event.key==='End'&&event.target===input.current)return;const links=[...event.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]')];if(!links.length)return;event.preventDefault();const at=links.indexOf(document.activeElement as HTMLAnchorElement),next=event.key==='Home'?0:event.key==='End'?links.length-1:at<0?(event.key==='ArrowDown'?0:links.length-1):(at+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;links[next].focus();}}>
   <label className="block font-medium" htmlFor={id+'-query'}>{t('label')}</label><input ref={input} id={id+'-query'} type="search" autoComplete="off" maxLength={160} value={text} onChange={e=>change(e.target.value)} placeholder={t('placeholder')} className="mt-2 w-full rounded-xl border border-cyan-300/20 bg-[#101E30] px-3 py-2 text-white outline-none focus:border-cyan-300"/>
   <p className="mt-2 text-xs leading-5 text-slate-400">{t('scope')}</p>
   {!text.trim()?<p className="mt-4 text-slate-300">{t('hint')}</p>:kinds.map(kind=><section key={kind} aria-label={t(kind)} className="mt-3 border-t border-cyan-300/15 pt-3"><h2 className="text-sm font-semibold text-cyan-200">{t(kind)}</h2>{groups[kind].state!=='ready'?<p role="status" className="mt-2 text-xs text-slate-400">{t(groups[kind].state)}</p>:groups[kind].hits.length===0?<p role="status" className="mt-2 text-xs text-slate-400">{t('empty')}</p>:<ul className="mt-2 space-y-1">{groups[kind].hits.map(hit=><li key={hit.href}><a href={hit.href} onClick={close} className="block break-words rounded-lg bg-[#101E30] px-3 py-2 text-white hover:bg-cyan-300/10 focus-visible:outline focus-visible:outline-cyan-200">{hit.label}</a></li>)}</ul>}</section>)}
  </div>
 </div>;
}
