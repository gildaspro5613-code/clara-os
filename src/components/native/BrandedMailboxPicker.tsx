'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {Check,ChevronDown,Mail} from 'lucide-react';

type MailboxOption={id:string;address:string};

/**
 * Presentation-only picker. The native select is kept as the controlled form
 * source for existing mail flows and browser fixtures, while users interact
 * with the fully branded listbox. No provider or permission logic lives here.
 */
export default function BrandedMailboxPicker({
  label,placeholder,value,options,disabled=false,onChange,
}:{
  label:string;placeholder:string;value:string;options:MailboxOption[];
  disabled?:boolean;onChange:(connectionId:string)=>void;
}){
  const [open,setOpen]=useState(false),[active,setActive]=useState(0);
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const optionRefs=useRef<Array<HTMLButtonElement|null>>([]);
  const id=useId();
  const selected=options.find(option=>option.id===value);
  const choices=[{id:'',address:placeholder},...options];
  const selectedIndex=Math.max(0,choices.findIndex(option=>option.id===value));

  useEffect(()=>{
    if(disabled&&open)setOpen(false);
  },[disabled,open]);

  useEffect(()=>{
    if(!open)return;
    const onPointerDown=(event:PointerEvent)=>{
      if(root.current&&!root.current.contains(event.target as Node))setOpen(false);
    };
    const onEscape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        event.preventDefault();setOpen(false);trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown',onPointerDown);
    document.addEventListener('keydown',onEscape);
    return()=>{
      document.removeEventListener('pointerdown',onPointerDown);
      document.removeEventListener('keydown',onEscape);
    };
  },[open]);

  function show(index=selectedIndex){
    if(disabled)return;
    setActive(index);setOpen(true);
    requestAnimationFrame(()=>optionRefs.current[index]?.focus());
  }
  function choose(id:string){
    onChange(id);setOpen(false);trigger.current?.focus();
  }
  function move(delta:number){
    const next=(active+delta+choices.length)%choices.length;
    setActive(next);optionRefs.current[next]?.focus();
  }

  return <div className="flex min-w-[235px] flex-col gap-2 text-slate-300">
    <span id={id+'-label'}>{label}</span>
    <div ref={root} className="relative min-w-0">
      {/* Existing native select preserves scripted selection and the same
          onChange path; it never opens the macOS/system menu for the user. */}
      <select aria-label={label} tabIndex={-1} className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(option=><option key={option.id} value={option.id}>{option.address}</option>)}
      </select>
      <button ref={trigger} type="button" role="combobox" aria-labelledby={id+'-label'}
        aria-expanded={open} aria-haspopup="listbox" aria-controls={id+'-list'}
        disabled={disabled}
        onClick={()=>open?setOpen(false):show()}
        onKeyDown={event=>{
          if(event.key==='ArrowDown'||event.key==='ArrowUp'){
            event.preventDefault();show(event.key==='ArrowUp'?choices.length-1:selectedIndex);
          }else if(event.key==='Home'||event.key==='End'){
            event.preventDefault();show(event.key==='Home'?0:choices.length-1);
          }
        }}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-cyan-400/40 bg-[#0a162b] px-3 py-2 text-left text-white transition hover:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-40">
        <span className="flex min-w-0 items-center gap-2"><Mail size={17} className="shrink-0 text-cyan-300" aria-hidden="true"/>
          <span className="truncate">{selected?.address??placeholder}</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-cyan-300 transition-transform ${open?'rotate-180':''}`} aria-hidden="true"/>
      </button>
      {open&&<div id={id+'-list'} role="listbox" aria-labelledby={id+'-label'}
        className="clara-glass-scroll absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-xl border border-cyan-400/40 bg-[#081525] p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.65)]">
        {choices.map((option,index)=><button key={option.id||'choose'} ref={element=>{optionRefs.current[index]=element;}}
          role="option" aria-selected={option.id===value} type="button"
          onClick={()=>choose(option.id)}
          onMouseEnter={()=>setActive(index)}
          onKeyDown={event=>{
            if(event.key==='ArrowDown'){event.preventDefault();move(1);}
            else if(event.key==='ArrowUp'){event.preventDefault();move(-1);}
            else if(event.key==='Home'||event.key==='End'){
              event.preventDefault();const next=event.key==='Home'?0:choices.length-1;
              setActive(next);optionRefs.current[next]?.focus();
            }else if(event.key==='Enter'||event.key===' '){
              event.preventDefault();choose(option.id);
            }else if(event.key==='Tab'){setOpen(false);}
          }}
          className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${option.id===value?'bg-cyan-900/65 text-cyan-100':active===index?'bg-cyan-500/15 text-white':'text-slate-200 hover:bg-cyan-500/10'}`}>
          <span className="truncate">{option.address}</span>
          {option.id===value&&<Check size={17} className="shrink-0 text-cyan-300" aria-hidden="true"/>}
        </button>)}
      </div>}
    </div>
  </div>;
}
