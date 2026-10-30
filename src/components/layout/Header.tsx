"use client";

import { BookOpen, Search, UserRound } from "lucide-react";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import NativeScopeSelector from "@/components/native/NativeScopeSelector";
import LocaleSwitcher from "@/components/ui/LocaleSwitcher";
import type { Locale } from "@/i18n/types";

const pageTitleKeys: Record<string, string> = {
  "/": "cockpit",
  "/clara": "clara",
  "/missions": "missions",
  "/conversations": "conversations",
  "/contacts": "contacts",
  "/telephonie": "telephonie",
  "/automatisations": "automatisations",
  "/documents": "documents",
  "/agenda": "agenda",
  "/journal": "memoire",
  "/brain": "brain",
  "/connexions": "connexions",
};

export default function Header({nativeContextAvailable=true}:{nativeContextAvailable?:boolean}) {
  const ui = useTranslations("ui");

  const pathname = usePathname();
  const accountMenu=useRef<HTMLDetailsElement>(null);
  const [loggingOut,setLoggingOut]=useState(false),[accountError,setAccountError]=useState(false);
  useEffect(()=>{if(accountMenu.current)accountMenu.current.open=false;},[pathname]);
  const locale = useLocale() as Locale;

  const tn = useTranslations("navigation");
  const tc = useTranslations("common");


  async function logout(){
    if(loggingOut||!window.confirm(ui("uiLogoutConfirm")))return;
    setLoggingOut(true);setAccountError(false);
    try{
      const response=await fetch('/api/auth/session/logout',{method:'POST',credentials:'same-origin'});
      const result=await response.json();
      if(!response.ok||result.success!==true)throw Error();
      if(accountMenu.current)accountMenu.current.open=false;
      // Clear authenticated in-memory views after the server revokes the session.
      window.location.replace('/');
    }catch{setAccountError(true);}finally{setLoggingOut(false);}
  }

  const pageTitleKey = pageTitleKeys[pathname];
  const pageTitle = pageTitleKey
    ? tn(pageTitleKey)
    : pathname
        .split("/")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

  return (
    <header className="relative z-30 flex h-[64px] flex-shrink-0 items-center border-b border-white/10 bg-[#08111F]/95 px-4 pl-16 backdrop-blur-xl sm:h-[70px] sm:px-6 sm:pl-20 lg:px-8">
      <div className="min-w-0 flex-1 sm:w-36 sm:flex-none xl:w-40">
        <Link href="/" className="block truncate text-lg font-semibold tracking-tight text-white transition-opacity hover:opacity-80">
          {pageTitle}
        </Link>
      </div>

      {pathname!=="/"&&<Link href="/" className="ml-3 shrink-0 text-xs text-cyan-200 underline sm:ml-4">{ui("uiBackCockpit")}</Link>}
      <a href="#main-workspace" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[70] focus:rounded-xl focus:bg-slate-900 focus:p-3 focus:text-cyan-100">{ui("uiSkipContent")}</a>
      <div className="mx-5 hidden min-w-0 flex-1 justify-center md:flex xl:mx-8">
        <Link href="/documents#document-search" className="flex min-h-10 w-full max-w-2xl min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/30 hover:bg-white/10">
          <Search size={18} className="shrink-0 text-cyan-300" />
          <span>{ui("uiDocumentSearch")}</span>
        </Link>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3 xl:w-80 xl:gap-4">
        <div className="hidden min-w-0 items-center gap-2 xl:flex">
          <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
          <span className="max-w-[150px] text-sm leading-5 text-slate-400">Mélodie Digital</span>
        </div>

        <LocaleSwitcher currentLocale={locale} />

        <Link href="/journal" title={ui("uiOpenJournal")} aria-label={ui("uiOpenJournal")} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/5 hover:text-cyan-200">
          <BookOpen size={19} />
        </Link>

        <details ref={accountMenu} id="native-account-menu" className="group" onKeyDown={event=>{if(event.key==="Escape"){event.currentTarget.open=false;event.currentTarget.querySelector("summary")?.focus();}}}>
          <summary aria-label={tc("profile")} title={ui("claraOSProfile")} className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-cyan-500 text-white marker:hidden">
            <UserRound size={19} aria-hidden="true" />
          </summary>
          <div className="fixed inset-x-3 top-[72px] z-50 max-h-[calc(100dvh-90px)] overflow-y-auto rounded-2xl border border-cyan-300/20 bg-[#08111F] p-4 shadow-2xl sm:inset-x-6 lg:left-auto lg:right-8 lg:w-[min(52rem,calc(100vw-20rem))]" data-account-settings>
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-medium">{tc("profile")}</h2><button type="button" className="text-sm text-cyan-200 underline" onClick={event=>{const menu=event.currentTarget.closest("details");if(menu){menu.open=false;menu.querySelector("summary")?.focus();}}}>{tc("close")}</button></div>
            <p className="mt-2 text-sm text-slate-300">{ui("uiAccountContextHelp")}</p>
            <NativeScopeSelector key={nativeContextAvailable?'scoped':'workspace'} nativeContextAvailable={nativeContextAvailable}/>
            <div className="mt-4 border-t border-white/10 pt-4"><button type="button" disabled={loggingOut} onClick={()=>void logout()} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-50">{loggingOut?tc("loading"):tc("logout")}</button>{accountError&&<p role="alert" className="mt-2 text-sm text-amber-100">{ui("uiLogoutError")}</p>}</div>
          </div>
        </details>
      </div>
    </header>
  );
}
