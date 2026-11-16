/** Reviewed Make Drive READ input: plain title term + optional folder scope.
 * Workspace identity always originates from the signed Clara native context.
 * Make already applies the title "contains" operator: do not send its DSL.
 */
export function nativeMakeDriveReadPayload(
 workspaceId:string,input:Readonly<Record<string,unknown>>,
):{workspaceId:string;query:string;folderId?:string}{
 if(typeof workspaceId!=='string'||workspaceId.length<1||workspaceId.length>160||
    !/^[a-zA-Z0-9._:-]+$/.test(workspaceId))
  throw new Error('MAKE_WORKSPACE_SCOPE_INVALID');
 if(!input||Object.getPrototypeOf(input)!==Object.prototype)
  throw new Error('MAKE_DRIVE_READ_INPUT_INVALID');
 const keys=Object.keys(input).sort().join('|');
 if(keys!=='query'&&keys!=='folderId|query')
  throw new Error('MAKE_DRIVE_READ_INPUT_INVALID');
 if(typeof input.query!=='string'||input.query.length>200||
    input.query.trim().length===0||/[\x00-\x1f\x7f]/.test(input.query))
  throw new Error('MAKE_DRIVE_READ_INPUT_INVALID');
 let query=input.query.trim();
 // Support only this legacy form. Never interpret arbitrary Drive expressions.
 const legacy=/^name\s+contains\s+(['"])(.*?)\1$/i.exec(query);
 if(legacy)query=legacy[2].trim();
 if(!query||query.length>200)
  throw new Error('MAKE_DRIVE_READ_INPUT_INVALID');
 let folderId:string|undefined;
 if(Object.prototype.hasOwnProperty.call(input,'folderId')){
  const raw=input.folderId;
  // Strict model-tool schemas can supply null or an empty string for the
  // optional first-search folder. Both mean "no folder yet"; an actual
  // folder ID is still required to be a bounded Drive identifier.
  if(raw!==null&&raw!==undefined&&raw!==''){
   if(typeof raw!=='string'||!/^[A-Za-z0-9_-]{8,160}$/.test(raw))
    throw new Error('MAKE_DRIVE_READ_FOLDER_INVALID');
   folderId=raw;
  }
 }
 return folderId===undefined?{workspaceId,query}:{workspaceId,query,folderId};
}
