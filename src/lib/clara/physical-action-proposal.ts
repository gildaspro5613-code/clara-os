/**
 * Strict parser for a Clara-proposed physical action.
 *
 * This parser never authorizes execution. It only converts a machine-readable
 * proposal into validated data that the Brain may place in PROPOSED state.
 */
export interface ConversationalPhysicalActionDraft {
  agentId: string;
  connector: string;
  capability: string;
  parameters: Record<string, unknown>;
  sessionId: string;
}

const MARKER = "CLARA_PHYSICAL_ACTION_PROPOSAL:";

export function extractPhysicalActionProposal(
  content: string,
): { content: string; proposal?: ConversationalPhysicalActionDraft } {
  const index = content.lastIndexOf(MARKER);
  if (index < 0) return { content };

  const visible = content.slice(0, index).trimEnd();
  const raw = content.slice(index + MARKER.length).trim();

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { content };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return { content };
  const item = value as Partial<ConversationalPhysicalActionDraft>;
  for (const key of ["agentId", "connector", "capability", "sessionId"] as const) {
    if (typeof item[key] !== "string" || !item[key]!.trim()) return { content };
  }
  if (!item.parameters || typeof item.parameters !== "object" || Array.isArray(item.parameters)) {
    return { content };
  }

  return { content: visible, proposal: item as ConversationalPhysicalActionDraft };
}

export const PHYSICAL_ACTION_PROPOSAL_INSTRUCTIONS = `
When the user requests an action that would affect physical professional equipment, do not claim it was executed.
If and only if all required execution fields are known, end the response with exactly one machine-readable line:
CLARA_PHYSICAL_ACTION_PROPOSAL:{"agentId":"...","connector":"...","capability":"...","parameters":{},"sessionId":"..."}
This line is only a proposal and never an authorization. If any field is unknown, ask for the missing information and emit no proposal line.
`;
