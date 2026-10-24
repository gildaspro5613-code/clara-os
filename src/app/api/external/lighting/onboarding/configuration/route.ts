import {DatabaseMagicQConnectionConfigurationRepository,MagicQConfigurationError} from "@/lib/connectors/internal/chamsys/magicq/configuration-repository";
import { NextResponse } from "next/server";
import {
  authenticateExternalProduct,
  ExternalProductConfigurationError,
} from "@/lib/external-capabilities/config";
import {
  ServerLightingConsoleConfigurationService,
  type SupportedLightingConsoleProvider,
} from "@/lib/connectors/internal/lighting-console-configuration-server";
import { MAGICQ_CONNECTION_PROVIDER } from "@/lib/connectors/internal/chamsys/magicq";
import { GRANDMA3_CONNECTOR_ID } from "@/lib/connectors/internal/ma-lighting/grandma3";
import { AVOLITES_TITAN_CONNECTOR_ID } from "@/lib/connectors/internal/avolites/titan";

export const dynamic = "force-dynamic";

type RequestBody = {
  provider: SupportedLightingConsoleProvider;
  host: string;
  port?: number;
  operation?: "READ" | "SAVE";
  expectedRevision?: number;
  connectionId?: string;
  fixtureChannels?: Record<string,number>;
  clearMapping?: boolean;
  confirmMapping?: boolean;
};

const SUPPORTED_PROVIDERS = new Set<string>([
  MAGICQ_CONNECTION_PROVIDER,
  GRANDMA3_CONNECTOR_ID,
  AVOLITES_TITAN_CONNECTOR_ID,
]);

function parseBody(value: unknown): RequestBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const host = typeof body.host === "string" ? body.host.trim() : "";
  const port = body.port;

  const allowed=["provider","host","port","operation","expectedRevision","connectionId","fixtureChannels","clearMapping","confirmMapping"];
  if(Object.keys(body).some(k=>!allowed.includes(k)))return null;
  if(body.operation!==undefined && body.operation!=="READ" && body.operation!=="SAVE")return null;
  if(body.operation==="READ"){
    if(provider!==MAGICQ_CONNECTION_PROVIDER || Object.keys(body).some(k=>!["provider","operation","connectionId"].includes(k)))return null;
    if(body.connectionId!==undefined&&(typeof body.connectionId!=="string"||!body.connectionId.trim()))return null;
    return {provider:MAGICQ_CONNECTION_PROVIDER,host:"",operation:"READ",...(body.connectionId!==undefined?{connectionId:body.connectionId as string}:{})};
  }
  if (!SUPPORTED_PROVIDERS.has(provider) || !host) return null;
  if(provider!==MAGICQ_CONNECTION_PROVIDER && Object.keys(body).some(k=>!["provider","host","port","operation"].includes(k)))return null;
  if(body.expectedRevision!==undefined&&(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0))return null;
  if(body.connectionId!==undefined&&(typeof body.connectionId!=="string"||!body.connectionId.trim()))return null;
  for(const key of ["clearMapping","confirmMapping"])if(body[key]!==undefined&&typeof body[key]!=="boolean")return null;
  if(Object.hasOwn(body,"fixtureChannels")&&(!body.fixtureChannels||typeof body.fixtureChannels!=="object"||Array.isArray(body.fixtureChannels)))return null;
  if (port !== undefined && (!Number.isInteger(port) || (port as number) < 1 || (port as number) > 65535)) {
    return null;
  }
  if (provider === GRANDMA3_CONNECTOR_ID && port === undefined) return null;

  return {
    provider: provider as SupportedLightingConsoleProvider,
    host,
    port: port as number | undefined,
    ...(body.expectedRevision!==undefined?{expectedRevision:body.expectedRevision as number}:{}),
    ...(body.connectionId!==undefined?{connectionId:body.connectionId as string}:{}),
    ...(Object.hasOwn(body,"fixtureChannels")?{fixtureChannels:body.fixtureChannels as Record<string,number>}:{}),
    ...(body.clearMapping!==undefined?{clearMapping:body.clearMapping as boolean}:{}),
    ...(body.confirmMapping!==undefined?{confirmMapping:body.confirmMapping as boolean}:{}),
  };
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

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const body = parseBody(rawBody);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid lighting console configuration request." },
        { status: 400 },
      );
    }

    if(body.operation==="READ") {
      const configuration=await new DatabaseMagicQConnectionConfigurationRepository().configured(product.workspaceId,"READ",body.connectionId?{connectionId:body.connectionId}:{});
      return NextResponse.json({success:true,configuration},{headers:{"Cache-Control":"no-store"}});
    }
    const fields={...body};delete fields.operation;
    const configuration = await new ServerLightingConsoleConfigurationService().configure({
      workspaceId: product.workspaceId,
      ...fields,
    });

    return NextResponse.json({ success: true, configuration });
  } catch (error) {
    if(error instanceof MagicQConfigurationError)return NextResponse.json({success:false,error:error.code,code:error.code},{status:error.status});
    if (error instanceof ExternalProductConfigurationError) {
      console.error("[API /external/lighting/onboarding/configuration] configuration error", error.message);
      return NextResponse.json(
        { success: false, error: "External product gateway is not configured." },
        { status: 503 },
      );
    }
    if (error instanceof TypeError || error instanceof RangeError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    console.error("[API /external/lighting/onboarding/configuration]", error);
    return NextResponse.json(
      { success: false, error: "Lighting console configuration failed." },
      { status: 500 },
    );
  }
}
