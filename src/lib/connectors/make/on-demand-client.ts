import {assertRecetteExternalExecutionBlocked} from "@/lib/recette/external-execution-guard";
import type {MakeApiCredentials,MakeOnDemandScenarioConfiguration,MakeScenarioExecutionResult,MakeScenarioInvocation} from "./types";
import {MakeWebhookError,type MakeFetch} from "./client";

const VALID_ZONE=/^(?:eu|us|ca|au)[1-9][0-9]?$/;
const MAX_INPUT_BYTES=32768;

/** Existing Make Scenario Inputs / Return Data contract over Make API v2.
 * Never retries POST: a timeout may still mean the business operation ran.
 * Calling authority and scenario allow-list remain owned by MakeCapabilityExecutor.
 */
export class MakeOnDemandClient {
 constructor(private readonly fetcher:MakeFetch=fetch){}
 async execute(config:MakeOnDemandScenarioConfiguration,credentials:MakeApiCredentials,invocation:MakeScenarioInvocation):Promise<MakeScenarioExecutionResult>{
  assertRecetteExternalExecutionBlocked("make.api");
  if(!Number.isSafeInteger(config.scenarioId)||config.scenarioId<=0)throw new MakeWebhookError("Invalid Make scenario ID.",undefined,"INVALID_CONFIGURATION");
  if(!VALID_ZONE.test(credentials.zone)||!credentials.token||credentials.token.length>4096||/[\r\n]/.test(credentials.token))throw new MakeWebhookError("Invalid Make API credentials or zone.",undefined,"INVALID_CONFIGURATION");
  const payload=invocation.payload??{};
  if(!payload||typeof payload!=="object"||Array.isArray(payload)||Object.getPrototypeOf(payload)!==Object.prototype)throw new MakeWebhookError("Make inputs must be a plain object.",undefined,"INVALID_CONFIGURATION");
  const body=JSON.stringify({data:payload,responsive:true});
  if(Buffer.byteLength(body,"utf8")>MAX_INPUT_BYTES)throw new MakeWebhookError("Make inputs exceed the approved size.",undefined,"INVALID_CONFIGURATION");
  const endpoint=`https://${credentials.zone}.make.com/api/v2/scenarios/${config.scenarioId}/run`;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),39000);
  let response:Response;
  try{
   response=await this.fetcher(endpoint,{method:"POST",headers:{"authorization":`Token ${credentials.token}`,"accept":"application/json","content-type":"application/json"},body,signal:controller.signal,cache:"no-store"});
  }catch{
   throw new MakeWebhookError("Make execution outcome unknown after network failure or timeout; never retry automatically.",undefined,controller.signal.aborted?"TIMEOUT":"NETWORK_ERROR",false);
  }finally{clearTimeout(timeout);}
  if(!response.ok)throw new MakeWebhookError("Make run did not return a successful HTTP response; outcome unconfirmed.",response.status,"HTTP_ERROR",false);
  let reply:unknown;try{reply=await response.json();}catch{throw new MakeWebhookError("Make returned an unreadable execution receipt.",response.status,"HTTP_ERROR",false);}
  if(!reply||typeof reply!=="object"||Array.isArray(reply))throw new MakeWebhookError("Make did not provide a valid execution receipt.",response.status,"HTTP_ERROR",false);
  const result=reply as Record<string,unknown>;
  // Make Scenario API responsive status: 1 success, 2 warning, 3 error.
  if(result.status!==1&&result.status!=="1")throw new MakeWebhookError("Make did not certify successful completion.",response.status,"HTTP_ERROR",false);
  const executionId=typeof result.executionId==="string"&&result.executionId.trim()?result.executionId.trim():undefined;
  return {ok:true,scenarioKey:invocation.scenarioKey,status:response.status,executionStatus:"completed",...(executionId?{executionId}:{}),data:result.outputs??null};
 }
}
