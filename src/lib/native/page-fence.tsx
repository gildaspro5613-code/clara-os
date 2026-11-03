import {cookies} from 'next/headers';
import { getTranslations } from 'next-intl/server';
import MainLayout from '@/components/layout/MainLayout';
import {withNativeScope} from './scoped-context';
import type {ReactNode} from 'react';
export async function nativePageFence() {
 const t=await getTranslations('ui');
 return <MainLayout><section className="flex min-h-full w-full items-center justify-center bg-[#0B1120] px-4 py-10 sm:px-8" data-native-authority="locked">
  <div className="w-full max-w-lg rounded-3xl border border-cyan-300/20 bg-[#08111F] p-6 text-center shadow-xl sm:p-10" data-google-sign-in-card>
   {/* Same official mark as the Sidebar; authentication remains on its existing route. */}
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src="/brand/clara-os-symbol.svg" alt="Clara OS" width={80} height={80} className="mx-auto h-20 w-20 object-contain"/>
   <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Mélodie Digital · Clara OS</p>
   <h1 className="mt-3 text-2xl font-semibold text-white">{t('signInWelcome')}</h1>
   <p className="mt-4 text-sm leading-6 text-slate-300">{t('signInDescription')}</p>
   <a href="/api/auth/google/start" className="mt-7 flex min-h-12 w-full items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">{t('signInWithGoogle')}</a>
   <p className="mt-5 text-sm leading-6 text-slate-400">{t('signInContextHelp')}</p>
  </div>
 </section></MainLayout>;
}
export async function nativePage(render:()=>Promise<ReactNode>){
 try{
  const cookie=(await cookies()).toString();
  const request=new Request('https://native-selector.invalid',{headers:{cookie}});
  return await withNativeScope(request,false,render);
 }catch{return nativePageFence();}
}
