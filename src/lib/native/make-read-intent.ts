/** Explicit, bounded operator-directed Make READ selection.
 * No implicit fallback from Google Drive, no send/write matching and no
 * natural-language permission grant. The provider is never selected merely
 * because a message mentions a document.
 */
export function explicitMakeDriveReadTitle(message:string):string|null{
 if(typeof message!=='string'||message.length>1200)return null;
 if(!/\bmake\b/i.test(message)||
    !/\b(?:drive|google drive)\b/i.test(message)||
    !/\b(?:recherch\w*|cherch\w*|trouv\w*|retrouv\w*|find|search|look up)\b/i.test(message))
    return null;
 const match=message.match(/[«“"]([^«»“”"]{1,200})[»”"]/u);
 const title=match?.[1]?.trim();
 if(!title||title.length>200||/[\x00-\x1f\x7f]/.test(title))return null;
 // Scope selection is still certified by the native SQL authority, NOT here.
 return title;
}
