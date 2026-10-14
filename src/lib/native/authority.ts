import { sql } from "@/lib/core/store/database";
import { opaque, registryContext, RegistryError, type RegistryQuery } from "@/lib/canonical/registry";

export interface NativeSelectors { workspaceId: string; clientId: string; projectId: string; sessionId: string }
export function nativeSelectors(request: Request) {
  // Parse the existing canonical cookie before any selector or storage access.
  const context = registryContext(request.headers.get("cookie"), "native-selector");
  let query = new URL(request.url).searchParams;
  if(!["workspaceId","clientId","projectId","sessionId"].some(key=>query.has(key))) {
    const selected=(request.headers.get("cookie")??"").split(";").map(x=>x.trim()).filter(x=>x.startsWith("clara_native_selection="));
    if(selected.length===1) {
      try { const value=JSON.parse(decodeURIComponent(selected[0].slice("clara_native_selection=".length)));
        if(!value||typeof value!=="object"||Array.isArray(value))throw Error();
        query=new URLSearchParams(value);
      } catch {throw new RegistryError(400,"EXPLICIT_NATIVE_SCOPE_REQUIRED");}
    }
  }
  const selectors = Object.fromEntries(["workspaceId","clientId","projectId","sessionId"].map(key => {
    if(query.getAll(key).length !== 1) throw new RegistryError(400,"EXPLICIT_NATIVE_SCOPE_REQUIRED");
    const value=query.get(key);
    if(key==="sessionId") {
      if(!value || value.length>512 || value!==value.trim() || /[\x00-\x20\x7f/\\]/.test(value) || value==="default") throw new RegistryError(400,"INVALID_NATIVE_SESSION_IDENTIFIER");
      return [key,value];
    }
    return [key,opaque(value)];
  })) as unknown as NativeSelectors;
  if(selectors.sessionId.startsWith("external:")) throw new RegistryError(403,"NATIVE_SCOPE_DENIED");
  return { ...selectors, digest:context.digest };
}
export function createNativeAuthority(query: RegistryQuery = sql) {
  return async function readSession(request: Request): Promise<Record<string,unknown>> {
    const scope=nativeSelectors(request);
    try {
      const rows=await query`SELECT clara_native_read_session(${scope.digest},${scope.workspaceId},${scope.clientId},${scope.projectId},${scope.sessionId}) AS data`;
      const data=(rows[0] as {data?:unknown}|undefined)?.data;
      if(!data || typeof data!=="object" || Array.isArray(data)) throw new RegistryError(403,"NATIVE_SCOPE_DENIED");
      return data as Record<string,unknown>;
    } catch(error) {
      if(error instanceof RegistryError) throw error;
      throw new RegistryError(503,"NATIVE_AUTHORITY_UNAVAILABLE");
    }
  };
}
export const readAuthorizedNativeSession=createNativeAuthority();
export function nativeFailure(error:unknown):Response {
  const denied=error instanceof RegistryError?error:new RegistryError(503,"NATIVE_AUTHORITY_UNAVAILABLE");
  return Response.json({success:false,code:denied.code},{status:denied.status,headers:{"Cache-Control":"no-store"}});
}
/** The legacy runtime/provider adapters still load global resources. Do not
 * unlock them merely because a session was authenticated or a scope exists. */
export async function nativeOperationFence(request:Request):Promise<Response|null> {
  try {
    await readAuthorizedNativeSession(request);
    return nativeFailure(new RegistryError(503,"NATIVE_SCOPED_OPERATION_UNAVAILABLE"));
  } catch(error) { return nativeFailure(error); }
}
