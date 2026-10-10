import { handleExternalEvent } from "@/lib/external-capabilities/external-event-handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleExternalEvent(request);
}
