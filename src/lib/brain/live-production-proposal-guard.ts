/** Compatibility gate for the EXISTING Clara Live Production response envelope.
 * This is not business authorization or a writer; Live retains final ownership
 * of parsing, approval, CAS and persistence.
 */
export interface LiveProductionScope { projectId: string; preparationId: string }
const sections = new Set([
  "event","timeline","personnel","transport","accommodation","catering",
  "dressing_rooms","access","security","resources","contacts","documents",
  "tasks","decisions","constraints","coordination",
]);
const safeText = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length <= max;

/** True only when Live's existing parseProductionResponse can receive the
 * complete, single structured envelope with the exact authenticated scope.
 * This function never accepts advice as an executable instruction.
 */
export function hasCompleteLiveProductionProposal(response: string, scope: LiveProductionScope): boolean {
  if (typeof response !== "string" || response.length > 100_000) return false;
  const trimmed=response.trim();
  const blocks=[...trimmed.matchAll(/```json\s*\n([\s\S]*?)\n```/gi)];
  const fenceCount=(trimmed.match(/```/g)??[]).length;
  if (blocks.length>1 || (blocks.length===1 && fenceCount!==2) ||
      (blocks.length===0 && fenceCount>0)) return false;
  const jsonText=blocks.length===1?blocks[0][1]:trimmed;
  if (jsonText.length>25_000) return false;
  let payload:unknown;
  try {payload=JSON.parse(jsonText);} catch {return false;}
  if (!payload || typeof payload!=="object" || Array.isArray(payload)) return false;
  const p=payload as Record<string,unknown>;
  if (p.schema!=="clara.production.proposal.v1" ||
      p.project_id!==scope.projectId || p.preparation_id!==scope.preparationId ||
      !Array.isArray(p.rows) || p.rows.length===0 || p.rows.length>50) return false;
  return p.rows.every((item:unknown)=>{
    if (!item || typeof item!=="object" || Array.isArray(item)) return false;
    const row=item as Record<string,unknown>;
    return sections.has(row.section as string) &&
      safeText(row.label,300) && row.label.trim().length>0 &&
      safeText(row.value,2000) && safeText(row.notes??"",1500) &&
      Object.keys(row).every(key=>["section","label","value","notes"].includes(key));
  });
}
