import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { createCanonicalArchiveAuthority } from "@/lib/canonical/archive-authority";
import { createCanonicalRegistry, RegistryError, type RegistryQuery } from "@/lib/canonical/registry";

const container = process.env.CANONICAL_TEST_CONTAINER;
test("real PostgreSQL: explicit registry, double consent, conflicts, revocation and isolation", { skip: !container }, async (t) => {
  assert.equal(container, "clara-canonical-test-postgres");
  const database="canonical_commit_"+randomUUID().replaceAll("-", "");
  execFileSync("docker",["exec",container,"createdb","-U","postgres",database]);
  t.after(()=>execFileSync("docker",["exec",container,"dropdb","-U","postgres",database]));
  for(const file of ["001_authenticated_workspaces.sql","002_verified_auth_identities.sql","008_canonical_client_project_registry.sql","009_canonical_archive_authority.sql","010_canonical_archive_serialization.sql"])
    execFileSync("docker",["exec","-i",container,"psql","-U","postgres","-d",database,"-q","-v","ON_ERROR_STOP=1"],{input:readFileSync("db/migrations/"+file),stdio:["pipe","pipe","pipe"]});
  const execute = (statement: string) => execFileSync("docker", ["exec", container!, "psql", "-U", "postgres", "-d", database, "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-c", statement], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  const query: RegistryQuery = async (strings, ...values) => {
    const statement = strings.reduce((s, part, i) => s + part + (i < values.length ? "'" + String(values[i]).replaceAll("'", "''") + "'" : ""), "");
    try { return execute(`SELECT row_to_json(r) FROM (${statement}) r`).trim().split("\n").filter(Boolean).map(s => JSON.parse(s)); }
    catch (e) { const code = String((e as { stderr: string }).stderr).match(/(?:ERROR:\s+)([A-Z0-9]{5}):/)?.[1]; throw Object.assign(new Error("SQL failed"), { code }); }
  };
  const suffix = randomUUID(); const w = "w-" + suffix, a = "a-" + suffix, b = "b-" + suffix;
  const digest = createHash("sha256").update(a).digest("hex"), other = createHash("sha256").update(b).digest("hex");
  execute(`INSERT INTO clara_auth_users(id) VALUES('${a}'),('${b}'); INSERT INTO clara_auth_workspaces(id) VALUES('${w}'); INSERT INTO clara_workspace_memberships(user_id,workspace_id,role) VALUES('${a}','${w}','owner'),('${b}','${w}','member'); INSERT INTO clara_auth_identities(issuer,subject,user_id) VALUES('test','${a}','${a}'),('test','${b}','${b}'); INSERT INTO clara_auth_sessions(token_hash,user_id,expires_at) VALUES('${digest}','${a}',NOW()+INTERVAL '1 hour'),('${other}','${b}',NOW()+INTERVAL '1 hour')`);
  const registry = createCanonicalRegistry(query), context = { digest, workspaceId: w }, stranger = { digest: other, workspaceId: w };
  await registry.command(context, "createClient", { id: "c1", displayName: "Client A" });
  await registry.command(context, "createClient", { id: "c2", displayName: "Client B" });
  for (const id of ["p1", "p2"]) await registry.command(context, "createProject", { clientId: "c1", projectId: id, displayName: id });
  assert.equal((await registry.command(context, "list", {}) as Array<{projects: unknown[]}>)[0].projects.length, 2);
  assert.deepEqual(await registry.command(stranger, "list", {}), []);
  await assert.rejects(registry.command(stranger, "createClient", { id: "c3", displayName: "Forbidden" }), (e: RegistryError) => e.status === 403);
  await assert.rejects(registry.command(context, "createProject", { clientId: "c2", projectId: "p1", displayName: "p1" }), (e: RegistryError) => e.status === 409);
  const begin = await registry.begin(context, "identity", {}) as { id: string; challenge: string; challengeId?: string };
  const id = begin.id ?? begin.challengeId!;
  await registry.pending(w, "propose", begin.challenge, { kind: "identity", proofId: "proof1", liveUserId: "live-" + suffix, liveProjectId: null });
  const candidate = await registry.candidate(context, id);
  const proof = { schemaVersion: "clara.canonical-link-proof.v1" as const, proofId: "proof1", challengeHash: candidate.tokenHash, kind: "identity" as const, liveUserId: "live-" + suffix, liveProjectId: null, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+240000).toISOString() };
  await assert.rejects(registry.confirm(stranger, id, async () => proof), (e: RegistryError) => e.status === 403);
  await assert.rejects(registry.confirm(context, id, async () => ({...proof,liveUserId: "forged"})), (e: RegistryError) => e.status === 403);
  await registry.confirm(context, id, async () => proof);
  await assert.rejects(registry.confirm(context, id, async () => proof), (e: RegistryError) => e.status === 409);
  const project = await registry.begin(context, "project", { clientId: "c1", projectId: "p1" }) as typeof begin;
  const pid = project.id ?? project.challengeId!;
  await registry.pending(w, "propose", project.challenge, { kind: "project", proofId: "proof2", liveUserId: proof.liveUserId, liveProjectId: "live-p1-"+suffix });
  const pc = await registry.candidate(context, pid);
  await registry.confirm(context, pid, async () => ({ ...proof, proofId:"proof2", kind:"project", challengeHash:pc.tokenHash, liveProjectId:pc.liveProjectId }));
  const authority = createCanonicalArchiveAuthority(query);
  await registry.command(context,"grantClient",{clientId:"c1",userId:b,read:true,archive:true,manage:false});
  await registry.command(context,"grantProject",{clientId:"c1",projectId:"p1",userId:b,read:true,archive:true,manage:false});
  await assert.rejects(authority.issue(stranger,"c1","p1","read"),(e:RegistryError)=>e.status===403);
  const duplicateIdentity = await registry.begin(stranger,"identity",{}) as typeof begin;
  await registry.pending(w,"propose",duplicateIdentity.challenge,{kind:"identity",proofId:"proof-duplicate",liveUserId:proof.liveUserId,liveProjectId:null});
  const dc=await registry.candidate(stranger,duplicateIdentity.challengeId!);
  await assert.rejects(registry.confirm(stranger,dc.id,async()=>({...proof,proofId:"proof-duplicate",challengeHash:dc.tokenHash})),(e:RegistryError)=>e.status===409);
  const ticket = await authority.issue(context,"c1","p1","archive");
  const redeemed = await authority.redeem(w,ticket.ticket) as {liveProjectId:string};
  assert.equal(redeemed.liveProjectId,pc.liveProjectId);
  await assert.rejects(authority.redeem("wrong-workspace",ticket.ticket),(e:RegistryError)=>e.status===403);
  await assert.rejects(authority.issue(context,"c2","p1","archive"),(e:RegistryError)=>e.status===403);
  await assert.rejects(authority.issue(stranger,"c1","p1","archive"),(e:RegistryError)=>e.status===403);
  const record = {version:"clara.live-archive-reference.v1" as const,productId:"clara-live" as const,status:"archived" as const,workspaceId:w,clientId:"c1",projectId:"p1",liveProjectId:pc.liveProjectId!,displayName:"p1",archivedAt:new Date().toISOString()};
  await assert.rejects(authority.commit(context,ticket.ticket,{...record,clientId:"c2"}),(e:RegistryError)=>e.status===403);
  await assert.rejects(authority.commit(context,ticket.ticket,record),(e:RegistryError)=>e.status===403);
  const receipt=await authority.settle(w,ticket.ticket,1,pc.liveProjectId,"commit") as {reference:typeof record;state:string};
  assert.equal(receipt.state,"committed");
  const persisted=receipt.reference;assert.equal(persisted.projectId,record.projectId);
  await assert.rejects(authority.redeem(w,ticket.ticket),(e:RegistryError)=>e.status===403);
  assert.deepEqual(await authority.history(context,"c1","p1"),persisted);
  const duplicateTicket=await authority.issue(context,"c1","p1","archive");
  assert.deepEqual((await authority.settle(w,duplicateTicket.ticket,1,pc.liveProjectId,"commit") as {reference:typeof record}).reference,persisted);
  assert.deepEqual(await authority.settle(w,ticket.ticket,1,pc.liveProjectId,"commit"),receipt);
  await assert.rejects(authority.settle(w,ticket.ticket,2,pc.liveProjectId,"commit"),(e:RegistryError)=>e.status===403);
  const revokedTicket=await authority.issue(context,"c1","p1","archive");
  await registry.command(context, "revokeIdentityLink", {});
  await assert.rejects(authority.redeem(w,revokedTicket.ticket),(e:RegistryError)=>e.status===403);
  await assert.rejects(authority.settle(w,revokedTicket.ticket,1,pc.liveProjectId,"commit"),(e:RegistryError)=>e.status===403);
  const records = await registry.command(context, "list", {}) as Array<{projects: Array<{liveProjectId: string | null}>}>;
  assert.equal(records[0].projects[0].liveProjectId, null);
  await assert.rejects(registry.pending(w, "inspect", project.challenge, {}), (e: RegistryError) => e.status === 403);
  assert.ok(Number(execute(`SELECT count(*) FROM clara_registry_audit WHERE workspace_id='${w}'`).trim()) >= 8);
  execute(`UPDATE clara_auth_sessions SET revoked_at=NOW() WHERE token_hash='${digest}'`);
  await assert.rejects(registry.command(context, "list", {}), (e: RegistryError) => e.status === 403);
});

// The fixture pauses a real ticket transaction with its workspace locked, then
// starts a registry read before continuing the ticket's session/ACL lock phase.
// Before the correction this produces PostgreSQL 40P01 deterministically.
test("canonical PostgreSQL commands and tickets share workspace-first lock order", { skip: !container }, () => {
  assert.equal(container, "clara-canonical-test-postgres");
  const result = execFileSync("python3", ["src/tests/helpers/canonical-lock-order.py"], { encoding: "utf8", timeout: 30000 });
  assert.equal(JSON.parse(result).deadlock, false);
});
