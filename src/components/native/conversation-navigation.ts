import {nativeContext,nativeCommands} from '@/lib/native/scoped-context';

/** Must be called inside nativePage's authenticated callback, before returning
 * the React tree. Deferred Server Components do not inherit this request fence. */
export async function loadNativeConversationNavigation(){
  const context=nativeContext();
  if(!context)return null;
  const data=await nativeCommands(context.query)(context.scope,'list').catch(()=>null);
  if(!data)return null;
  const {workspaceId,clientId,projectId,sessionId}=context.scope;
  // Never pass the authentication digest to client components.
  return {scope:{workspaceId,clientId,projectId,sessionId},sessions:data.sessions as {sessionId:string;updatedAt:string}[]};
}
