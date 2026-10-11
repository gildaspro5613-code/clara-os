import { NextResponse } from "next/server";
import {
  authenticateExternalProduct,
  ExternalProductConfigurationError,
} from "@/lib/external-capabilities/config";
import {
  parseLiveArchiveReference,
  type LiveArchiveReference,
} from "@/lib/documents/live-archive-reference";

export const dynamic = "force-dynamic";

/**
 * Product-authenticated archive references. Clara Live remains the source of
 * technical projects. This route only stores documentary references in OS.
 *
 * IMPORTANT: The product credential authenticates the configured workspace;
 * it does not establish user/client ownership. Writes remain disabled until
 * a verified project-ownership authorization path is connected.
 */
function authorize(request: Request) {
  const product = authenticateExternalProduct(
    "clara-live",
    request.headers.get("authorization"),
  );
  return product?.productId === "clara-live" ? product : null;
}

export async function GET(request: Request) {
  try {
    const product = authorize(request);
    if (!product) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const clientId = params.get("clientId")?.trim() ?? "";
    if (!clientId || clientId.length > 160) {
      return NextResponse.json({ success: false, message: "clientId required" }, { status: 400 });
    }
    // Product-wide tokens do not prove client-level read authorization.
    // Do not expose client archives until a scoped user/client permission check exists.
    return NextResponse.json({ success: false, message: "Client-level archive access is not configured." }, { status: 403 });
  } catch (error) {
    if (error instanceof ExternalProductConfigurationError) {
      return NextResponse.json({ success: false, message: "Product configuration unavailable" }, { status: 503 });
    }
    return NextResponse.json({ success: false, message: "Archive lookup failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const product = authorize(request);
    if (!product) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const input: unknown = await request.json();
    const record: LiveArchiveReference = parseLiveArchiveReference(input);
    if (record.workspaceId !== product.workspaceId) {
      return NextResponse.json({ success: false, message: "Workspace mismatch" }, { status: 403 });
    }
    // Deliberately fail closed until authenticated project/client ownership can
    // be verified against Clara OS's canonical records.
    return NextResponse.json({ success: false, message: "Project ownership verification is required before archiving." }, { status: 403 });
  } catch (error) {
    if (error instanceof ExternalProductConfigurationError) {
      return NextResponse.json({ success: false, message: "Product configuration unavailable" }, { status: 503 });
    }
    if (error instanceof SyntaxError || error instanceof Error && error.message.startsWith("Invalid Live archive")) {
      return NextResponse.json({ success: false, message: "Invalid archive reference" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Archive request failed" }, { status: 500 });
  }
}
