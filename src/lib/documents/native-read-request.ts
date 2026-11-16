/** Browser request identity survives a lost acknowledgement and refresh. No automatic POST retry. */
export async function readNativeDocument(fileId:string,question:string,locale:string):Promise<Response>{
 const scope=await fetch('/api/documents?action=references',{cache:'no-store'});if(!scope.ok)return scope;
 const selected=await scope.json();if(!selected.missionId||!selected.connectionId)throw Error('Explicit documentary mission required');
 const key=['clara.document.pending',selected.connectionId,selected.missionId,fileId].join(':');
 const saved=sessionStorage.getItem(key),operation=saved?JSON.parse(saved):{operationId:crypto.randomUUID(),question,locale};
 if(operation.question!==question||operation.locale!==locale)throw Error('A different documentary request remains unresolved');
 sessionStorage.setItem(key,JSON.stringify(operation));
 const response=await fetch('/api/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',fileId,...operation})});
 if(response.headers.get('X-Clara-Document-Result')==='failed'||response.ok&&(await response.clone().json()).success)sessionStorage.removeItem(key);
 return response;
}
