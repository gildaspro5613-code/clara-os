import {cookies} from 'next/headers';
import { getTranslations } from 'next-intl/server';
import MainLayout from '@/components/layout/MainLayout';
import {withNativeScope} from './scoped-context';
import type {ReactNode} from 'react';
export async function nativePageFence() {
 const t=await getTranslations('ui');
 return <MainLayout><section className="w-full p-8" data-native-authority="locked"><h1 className="text-xl text-white">{t('nativeAccessLocked')}</h1><p className="mt-3 max-w-2xl text-sm text-white/65">{t('nativeAccessHelp')}</p></section></MainLayout>;
}
export async function nativePage(render:()=>Promise<ReactNode>){
 try{
  const cookie=(await cookies()).toString();
  const request=new Request('https://native-selector.invalid',{headers:{cookie}});
  return await withNativeScope(request,false,render);
 }catch{return nativePageFence();}
}
