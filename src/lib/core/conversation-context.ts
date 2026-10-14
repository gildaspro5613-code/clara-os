import type { Event } from "@/types";
import type { ClaraSession } from "./session";
import { activeProjectId } from "@/lib/brain/live-project-context";

export function sameConversationScope(a: Event, b: Event): boolean {
  return ['productId','workspaceId','userId','sessionId'].every(key=>
    a.context?.[key as keyof NonNullable<Event['context']>]===b.context?.[key as keyof NonNullable<Event['context']>]) && activeProjectId(a)===activeProjectId(b) && a.context?.metadata?.externalProductWorkspaceId===b.context?.metadata?.externalProductWorkspaceId;
}
/** Only the hydrated durable session can supply history; discard caller history. */
export function withPersistedConversation(session: ClaraSession,event: Event): Event {
  if(event.type!=='USER_MESSAGE')return event;
  const seen=new Set<string>();let chars=0;
  const history=session.conversation.filter(entry=>{
    if(seen.has(entry.id))return false;seen.add(entry.id);return true;
  }).slice(-24).map(entry=>({...entry,content:entry.content.slice(0,4000)}));
  const bounded=history.slice().reverse().filter(entry=>{chars+=entry.content.length;return chars<=24000;}).reverse();
  return {...event,payload:{...(event.payload && typeof event.payload==='object' ? event.payload : {}),
    conversationHistory:bounded.map(({role,content,generation})=>({role,content:generation && generation.status!=="completed" ? `[Clara: réponse ${generation.status}, non complète] ${content}` : content})),
    userFirstName:session.user.firstName}};
}
