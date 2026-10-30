import {getTranslations} from 'next-intl/server';
import MainLayout from '@/components/layout/MainLayout';
import GlassPanel from '@/components/ui/GlassPanel';
import CockpitLayout from './CockpitLayout';
import HeroBackdrop from './hero/HeroBackdrop';

/** Presentation only: no sessions, stores, operational resolver or active widgets. */
export default async function WorkspaceWelcome(){
 const t=await getTranslations('ui'),cockpit=await getTranslations('cockpitUi');
 return <MainLayout nativeContextAvailable={false}><CockpitLayout hero={
  <section data-cockpit-hero data-cockpit-state="no-project" className="relative min-h-[720px] overflow-hidden bg-[#020914]">
   <HeroBackdrop/>
   <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:px-10">
    <GlassPanel><h1 className="text-2xl font-semibold text-white">{t('cockpitNoProjectSelected')}</h1>
     <p className="mt-3 text-white/70">{t('cockpitNoProjectHelp')}</p></GlassPanel>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
     {[cockpit('currentMission'),cockpit('latestConversations'),t('uiDocumentSearch'),t('uiOpenJournal')].map(title=>
      <GlassPanel key={title} title={title}><p className="text-sm text-white/65">{t('cockpitProjectRequired')}</p></GlassPanel>)}
    </div>
   </div>
  </section>
 }/></MainLayout>;
}
