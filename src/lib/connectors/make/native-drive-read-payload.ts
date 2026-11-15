/** Make's reviewed Drive scenario requires a workspaceId and query.
 * The workspace selector is trusted Clara native context, not a model argument.
 */
export function nativeMakeDriveReadPayload(
 workspaceId:string,input:Readonly<Record<string,unknown>>,
):{workspaceId:string;query:string}{
 if(typeof workspaceId!=='string'||workspaceId.length<1||workspaceId.length>160||
    !/^[a-zA-Z0-9._:-]+$/.test(workspaceId))
  throw new Error('MAKE_WORKSPACE_SCOPE_INVALID');
 if(!input||Object.getPrototypeOf(input)!==Object.prototype||
    Object.keys(input).length!==1||Object.keys(input)[0]!=='query'||
    typeof input.query!=='string'||input.query.length>200||
    input.query.trim().length===0||/[\x00-\x1f\x7f]/.test(input.query))
  throw new Error('MAKE_DRIVE_READ_INPUT_INVALID');
 return {workspaceId,query:input.query.trim()};
}
