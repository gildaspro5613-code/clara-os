import test from "node:test";
import assert from "node:assert/strict";
import { createCanonicalArchiveService } from "@/lib/canonical/archive-service";
import { type CanonicalScope, type createCanonicalArchiveAuthority } from "@/lib/canonical/archive-authority";
import { RegistryError } from "@/lib/canonical/registry";
import type { LiveArchiveReference } from "@/lib/documents/live-archive-reference";

test("archive service checks fresh Live state, scoped grants, outages and reopened history",async()=>{
  const scope:CanonicalScope={osUserId:"u",workspaceId:"w",clientId:"c",projectId:"p",clientName:"Named client",projectName:"Named project",liveUserId:"lu",liveProjectId:"lp",identityProofId:"ip",projectProofId:"pp",operation:"archive"};
  let status:"active"|"completed"="active", fail=false, revoked=false, forged=false, commits=0;
  let saved:LiveArchiveReference|null=null;
  const context={digest:"d",workspaceId:"w"};
  const current=async()=>{if(revoked)throw new RegistryError(403,"DENIED");return scope;};
  const authority:ReturnType<typeof createCanonicalArchiveAuthority>={
    cancelDigest:async()=>({}),settle:async()=>({}),current,issue:async()=>({scope:await current(),ticket:"t"}),redeem:async()=>scope,
    history:async()=>{await current();return saved;},
    commit:async(_context,_ticket,record)=>{await current();commits++;saved??=record;return saved;},
  };
  const service=createCanonicalArchiveService(authority,async(_path,payload)=>{
    if(fail)throw new RegistryError(503,"UNAVAILABLE");
    if (_path.endsWith('/archive-commit')) {
      commits++;await current();saved??={version:"clara.live-archive-reference.v1",productId:"clara-live",status:"archived",workspaceId:"w",clientId:"c",projectId:"p",liveProjectId:"lp",displayName:"Named project",archivedAt:new Date().toISOString()};
      return {state:"committed",reference:saved};
    }
    const operation=(payload as {operation:string}).operation;
    if(operation==="archive"&&status!=="completed")throw new RegistryError(403,"NOT_COMPLETED");
    return {authorization:{schemaVersion:"clara.live-archive-authorization.v1",productId:"clara-live",osUserId:scope.osUserId,workspaceId:"w",clientId:forged?"other":"c",projectId:"p",liveProjectId:"lp",lifecycleRevision:1,status,completedAt:status==="completed"?new Date(Date.now()-1000).toISOString():null,verifiedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+30000).toISOString(),displayName:"Named project",sourceUrl:"https://live.melodie.digital/projects/lp",permissions:{workspace:true,client:true,project:true,read:true,archive:operation==="archive"&&status==="completed"}}};
  });
  await assert.rejects(service.archive(context,"c","p"),RegistryError);assert.equal(commits,0);
  status="completed";forged=true;await assert.rejects(service.archive(context,"c","p"),RegistryError);assert.equal(commits,0);
  forged=false;await service.archive(context,"c","p");assert.equal(commits,1);
  const archived=saved;status="active";
  await assert.rejects(service.archive(context,"c","p"),RegistryError);
  const history=await service.read(context,"c","p");assert.equal(history.currentStatus,"active");assert.equal(history.reference,archived);
  revoked=true;await assert.rejects(service.read(context,"c","p"),RegistryError);assert.equal(saved,archived);
  revoked=false;fail=true;await assert.rejects(service.read(context,"c","p"),(e:RegistryError)=>e.status===503);assert.equal(saved,archived);
});
