import Link from 'next/link';
import {getLocale,getTranslations} from 'next-intl/server';
import {CalendarDays,FileText,Mail,Megaphone,Workflow,ArrowUpRight,ShieldCheck} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import {automationCards,automationCopy} from '@/lib/automations/automation-cards';
import MakeAutomationCertification from '@/components/automatisations/MakeAutomationCertification';

const icons={calendar:CalendarDays,documents:FileText,email:Mail,brevo:Megaphone,make:Workflow};

export default async function AutomatisationsPage(){
 const [t,locale]=await Promise.all([getTranslations('automations'),getLocale()]);
 const copy=automationCopy(locale);
 return <MainLayout>
  <main className="min-h-full w-full bg-[#050b16] px-5 py-8 text-white sm:px-8 lg:px-10">
   <div className="mx-auto max-w-7xl">
    <header className="mb-8 border-b border-cyan-300/10 pb-7">
     <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/75">{t('section')}</p>
     <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
     <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300/75">{copy.intro}</p>
    </header>
    <section aria-labelledby="automation-heading">
     <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 id="automation-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">{copy.heading}</h2>
      <p className="max-w-2xl text-xs leading-5 text-slate-400">{copy.disclaimer}</p>
     </div>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {automationCards.map(card=>{
       const Icon=icons[card.key],label=copy.cards[card.key],status=copy.statuses[card.status];
       return <article key={card.key} data-automation-card={card.key} className="group flex min-h-[252px] min-w-0 flex-col rounded-[24px] border border-cyan-300/15 bg-gradient-to-br from-[#152536]/85 via-[#0d1b2b]/95 to-[#091421] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.17)] transition-colors hover:border-cyan-300/35 sm:p-7">
        <div className="flex items-start justify-between gap-3">
         <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10"><Icon size={24} strokeWidth={1.7} aria-hidden="true" className="text-cyan-300"/></span>
         {card.key==='make'
         ? <MakeAutomationCertification locale={locale}/>
         : <span className="max-w-[65%] rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-right text-[11px] font-medium leading-4 text-slate-200">{status}</span>}
        </div>
        <h3 className="mt-6 break-words text-xl font-semibold leading-snug text-white">{label.title}</h3>
        <p className="mt-2 flex-1 break-words text-sm leading-6 text-slate-300/75">{label.description}</p>
        <Link prefetch={false} href={card.href} className="mt-6 inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
         <span>{label.action}</span><ArrowUpRight size={17} aria-hidden="true"/>
        </Link>
       </article>
      })}
     </div>
    </section>
    <p className="mt-7 flex max-w-4xl items-start gap-2 text-xs leading-6 text-slate-400"><ShieldCheck size={17} aria-hidden="true" className="mt-1 shrink-0 text-cyan-300"/>{copy.disclaimer}</p>
   </div>
  </main>
 </MainLayout>;
}
