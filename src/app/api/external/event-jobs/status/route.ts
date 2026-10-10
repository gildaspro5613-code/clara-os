import { NextResponse } from "next/server";
import { authenticateExternalProduct } from "@/lib/external-capabilities/config";
import { operationScopeKey } from "@/lib/external-capabilities/document-operations";
import { eventJobs, publicJob } from "@/lib/external-capabilities/event-jobs";
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const product = authenticateExternalProduct(request.headers.get('x-clara-product'), request.headers.get('authorization'));
    if (!product) return NextResponse.json({ success: false, code: 'UNAUTHORIZED' }, { status: 401 });
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ success: false, code: "INVALID_EVENT_JOB" }, { status: 400 });
    const scope = input.scope;
    if (typeof input.jobId !== 'string' || !/^[a-f0-9]{64}$/.test(input.jobId) || !scope ||
        !['productId','workspaceId','userId','sessionId'].every(key => typeof scope[key] === 'string' && scope[key].trim() && scope[key].length <= 160 && !/[\\/\0]/.test(scope[key])))
      return NextResponse.json({ success: false, code: 'INVALID_EVENT_JOB' }, { status: 400 });
    if (scope.productId !== product.productId) return NextResponse.json({ success: false, code: 'SCOPE_MISMATCH' }, { status: 403 });
    const job = await eventJobs.lookup(operationScopeKey({productId:scope.productId,workspaceId:scope.workspaceId,userId:scope.userId,sessionId:scope.sessionId}, product.workspaceId), input.jobId);
    if (!job) return NextResponse.json({ success: false, code: 'EVENT_JOB_NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ success: true, data: publicJob(job) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ success: false, code: 'EVENT_JOB_UNAVAILABLE' }, { status: 503 }); }
}
