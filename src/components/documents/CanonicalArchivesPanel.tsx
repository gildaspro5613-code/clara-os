"use client";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
type Project = { id:string; displayName:string; liveProjectId:string|null };
type Client = { id:string; displayName:string; projects:Project[] };
type Current = { reference:{ archivedAt:string }|null; currentStatus:"active"|"completed"; sourceUrl:string; archivable:boolean };
export default function CanonicalArchivesPanel() {
  const ui = useTranslations("ui");
  const locale=useLocale();

  const [workspaces,setWorkspaces] = useState<string[]>([]), [workspace,setWorkspace] = useState("");
  const [clients,setClients] = useState<Client[]>([]), [client,setClient] = useState("");
  const [project,setProject] = useState(""), [current,setCurrent] = useState<Current|null>(null);
  const [busy,setBusy] = useState(false), [message,setMessage] = useState(""), [after,setAfter] = useState<string|null>(null);
  const generation = useRef(0);
  const [projects,setProjects] = useState<Project[]>([]), [projectAfter,setProjectAfter] = useState<string|null>(null);
  const loadWorkspace = useCallback(async (selected:string) => {
    const version=++generation.current;
    setWorkspace(selected);setClients([]);setClient("");setProject("");setCurrent(null);setAfter(null);setProjects([]);setProjectAfter(null);
    if(!selected)return;setBusy(true);
    try {
      const response=await fetch("/api/canonical/registry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"list",workspaceId:selected,limit:50})});
      const body=await response.json();if(version!==generation.current)return;if(!body.success)throw Error();
      setClients(body.data);setAfter(body.data.length===50?body.data.at(-1).id:null);setMessage(body.data.length?"":ui("noAuthorizedClientsToDisplay"));
    } catch {if(version===generation.current)setMessage(ui("projectListUnavailable"));}
    finally {if(version===generation.current)setBusy(false);}
  },[ui]);
  useEffect(() => {
    const controller = new AbortController();
    const generationRef = generation;
    fetch("/api/canonical/registry", {cache:"no-store",signal:controller.signal}).then(r=>r.json()).then(body=>{
      if (!body.success) { setMessage(ui("signInToViewAuthorizedProjects")); return; }
      const values = body.data.map((row:{workspace_id:string})=>row.workspace_id);
      setWorkspaces(values); if(values.length===1) void loadWorkspace(values[0]);
    }).catch(()=>{ if(!controller.signal.aborted) setMessage(ui("viewingUnavailable")); });
    return ()=>{controller.abort();generationRef.current++;};
  },[loadWorkspace,ui]);
  async function loadProjects(selected:string, cursor?:string) {
    const version=++generation.current;setClient(selected);setProject("");setCurrent(null);if(!cursor)setProjects([]);setProjectAfter(null);
    if(!selected)return;setBusy(true);
    try {
      const response=await fetch("/api/canonical/registry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"listProjects",workspaceId:workspace,clientId:selected,limit:50,...(cursor?{after:cursor}:{})})});
      const body=await response.json();if(version!==generation.current)return;if(!body.success)throw Error();
      setProjects(prev=>cursor?[...prev,...body.data]:body.data);setProjectAfter(body.data.length===50?body.data.at(-1).id:null);
    } catch {if(version===generation.current)setMessage(ui("projectListUnavailable"));}
    finally {if(version===generation.current)setBusy(false);}
  }
  async function inspect(selected:string) {
    const version=++generation.current;setProject(selected);setCurrent(null);setMessage("");if(!selected)return;setBusy(true);
    try {
      const response=await fetch(`/api/documents/live-archives?${new URLSearchParams({workspaceId:workspace,clientId:client,projectId:selected})}`,{cache:"no-store"});
      const body=await response.json();if(generation.current!==version)return;if(!body.success)throw Error();setCurrent(body.data);
    } catch {if(generation.current===version)setMessage(ui("projectPermissionsOrStatusCouldNotBeVerified"));}
    finally {if(generation.current===version)setBusy(false);}
  }
  async function archive() {
    const version=++generation.current;setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/documents/live-archives",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspaceId:workspace,clientId:client,projectId:project})});
      const body=await response.json();if(generation.current!==version)return;if(!body.success)throw Error();await inspect(project);
    } catch {if(generation.current===version)setMessage(ui("archivingDeniedCheckPermissionsAndProjectClosure"));}
    finally {if(generation.current===version)setBusy(false);}
  }
  async function more() {
    if(!after)return;setBusy(true);const version=generation.current;
    try {
      const response=await fetch("/api/canonical/registry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"list",workspaceId:workspace,limit:50,after})});
      const body=await response.json();if(version!==generation.current)return;if(!body.success)throw Error();setClients(prev=>[...prev,...body.data]);setAfter(body.data.length===50?body.data.at(-1).id:null);
    } catch {if(version===generation.current)setMessage("Chargement indisponible.");}
    finally {if(version===generation.current)setBusy(false);}
  }
  return <section aria-label={ui("archivedClaraLiveProjects")} className="mb-6 rounded-xl border border-white/10 p-5">
    <h2 className="font-semibold">{ui("archivedClaraLiveProjects")}</h2>
    <div className="mt-3 flex flex-wrap gap-3">
      {workspaces.length>1&&<label>{ui("workspace")}{" "}<select disabled={busy} value={workspace} onChange={e=>void loadWorkspace(e.target.value)} className="bg-slate-900"><option value="">{ui("choose")}</option>{workspaces.map(w=><option key={w}>{w}</option>)}</select></label>}
      <label>{ui("client")}{" "}<select disabled={busy||!clients.length} value={client} onChange={e=>void loadProjects(e.target.value)} className="bg-slate-900"><option value="">{ui("chooseAClient")}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.displayName}</option>)}</select></label>
      <label>{ui("project")}{" "}<select disabled={busy||!client} value={project} onChange={e=>void inspect(e.target.value)} className="bg-slate-900"><option value="">{ui("chooseAProject")}</option>{projects.map(p=><option key={p.id} value={p.id} disabled={!p.liveProjectId}>{p.displayName}{!p.liveProjectId?ui("associationRequired"):""}</option>)}</select></label>
      {projectAfter&&<button disabled={busy} onClick={()=>void loadProjects(client,projectAfter)}>{ui("showMoreProjects")}</button>}
      {after&&<button disabled={busy} onClick={()=>void more()}>{ui("showMoreClients")}</button>}
    </div>
    {busy&&<p className="mt-3 text-sm">{ui("checking")}</p>}
    {message&&<p role="status" className="mt-3 text-sm text-white/60">{message}</p>}
    {current&&<div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
      <span>{ui("currentLiveStatus")}{" "}{current.currentStatus==="completed"?ui("completed"):ui("active")}</span>
      {current.reference?<span>{ui("administrativeArchiveRetainedSince")}{" "}{new Date(current.reference.archivedAt).toLocaleDateString(locale)}</span>:<button disabled={busy||!current.archivable} onClick={()=>void archive()} className="rounded bg-cyan-800 px-3 py-2 disabled:opacity-40">{ui("archiveTheCompletedProject")}</button>}
      <a href={current.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300">{ui("openTheProjectInClaraLive")}</a>
    </div>}
  </section>;
}
