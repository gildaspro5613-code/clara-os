import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import GlassPanel from '@/components/ui/GlassPanel';

/** Presentation only. Never imports a store, widget or business session. */
export default async function ContextRequiredPanel({title,href,className=''}:{title:string;href?:string;className?:string}){
 const ui=await getTranslations('ui');
 return <GlassPanel title={title} className={className}>
  <p className="text-sm leading-relaxed text-white/65">{ui('cockpitProjectRequired')}</p>
  {href&&<Link prefetch={false} href={href} className="mt-4 inline-block text-sm text-cyan-200 underline underline-offset-4">{title} →</Link>}
 </GlassPanel>;
}
