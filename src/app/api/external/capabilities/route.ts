import { NextResponse } from "next/server";
import {
  authenticateExternalProduct,
  ExternalProductConfigurationError,
} from "@/lib/external-capabilities/config";
import {
  ExternalCapabilityGateway,
  ExternalCapabilityGatewayError,
  type ExternalCapabilityRequest,
} from "@/lib/external-capabilities/gateway";

export const dynamic = "force-dynamic";

function errorStatus(error: ExternalCapabilityGatewayError): number {
  switch (error.code) {
    case "INVALID_REQUEST":
      return 400;
    case "CAPABILITY_NOT_ALLOWED":
      return 403;
    case "CAPABILITY_NOT_SUPPORTED":
      return 422;
    case "CONNECTION_NOT_CONFIGURED":
      return 503;
  }
}

export async function POST(request: Request) {
  try {
    const product = authenticateExternalProduct(
      request.headers.get("x-clara-product"),
      request.headers.get("authorization"),
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Unauthorized external product." },
        { status: 401 },
      );
    }

    let body: ExternalCapabilityRequest;
    try {
      body = (await request.json()) as ExternalCapabilityRequest;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const gateway = new ExternalCapabilityGateway();
    const result = await gateway.execute(product, body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ExternalCapabilityGatewayError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: errorStatus(error) },
      );
    }

    if (error instanceof ExternalProductConfigurationError) {
      console.error("[API /external/capabilities] configuration error", error.message);
      return NextResponse.json(
        { success: false, error: "External product gateway is not configured." },
        { status: 503 },
      );
    }

    console.error("[API /external/capabilities]", error);
    return NextResponse.json(
      { success: false, error: "External capability execution failed." },
      { status: 500 },
    );
  }
}
