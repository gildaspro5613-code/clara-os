import { sql } from "@/lib/core/store/database";
import type { BrevoWebhookEvent } from "./webhook";

export interface BrevoEventRecord extends BrevoWebhookEvent { id: string; }

async function initialize() {
  await sql`
    CREATE TABLE IF NOT EXISTS clara_brevo_events (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      event TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      email TEXT,
      message_id TEXT,
      campaign_id INTEGER,
      link TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function recordBrevoEvent(workspaceId: string, event: BrevoWebhookEvent): Promise<void> {
  await initialize();
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO clara_brevo_events
      (id, workspace_id, event, occurred_at, email, message_id, campaign_id, link)
    VALUES
      (${id}, ${workspaceId}, ${event.event}, ${event.occurredAt},
       ${event.email ?? null}, ${event.messageId ?? null}, ${event.campaignId ?? null}, ${event.link ?? null})
  `;
}

export async function listBrevoEvents(workspaceId: string, limit = 100): Promise<BrevoEventRecord[]> {
  await initialize();
  const rows = await sql`
    SELECT id, event, occurred_at, email, message_id, campaign_id, link
    FROM clara_brevo_events WHERE workspace_id = ${workspaceId}
    ORDER BY occurred_at DESC LIMIT ${limit}
  ` as Array<{id:string;event:BrevoWebhookEvent["event"];occurred_at:Date|string;email:string|null;message_id:string|null;campaign_id:number|null;link:string|null}>;
  return rows.map(row=>({
    id:row.id, provider:"brevo", event:row.event, occurredAt:new Date(row.occurred_at),
    ...(row.email?{email:row.email}:{}), ...(row.message_id?{messageId:row.message_id}:{}),
    ...(row.campaign_id!==null?{campaignId:row.campaign_id}:{}), ...(row.link?{link:row.link}:{}),
  }));
}
