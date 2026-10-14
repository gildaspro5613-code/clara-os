import type { OpenAIResponsesResult } from "@/lib/connectors/internal/openai/responses/openai-responses-result";
import type { Locale } from "@/i18n/types";
export interface ResponseGeneration {
  status: "completed" | "incomplete" | "failed" | "timeout";
  failureCategory?: string;
  recoverable: boolean;
}
export function responseGeneration(result: OpenAIResponsesResult): ResponseGeneration {
  const recoverable=!!result.content.trim();
  if (!result.success) return {status:result.failureCategory==='provider_timeout'?'timeout':'failed',failureCategory:result.failureCategory??'provider_unknown',recoverable};
  if(result.responseStatus==='incomplete')return {status:'incomplete',failureCategory:result.incompleteReason==='max_output_tokens'?'output_truncated':result.incompleteReason==='content_filter'?'output_filtered':'provider_incomplete',recoverable};
  if(result.responseStatus!=='completed')return {status:'failed',failureCategory:'provider_failed',recoverable};
  if(!recoverable)return {status:'failed',failureCategory:'empty_output',recoverable:false};
  return {status:'completed',recoverable:false};
}
const notices: Record<Locale,string>={
 fr:'Réponse interrompue. Le texte ci-dessus est partiel et doit être vérifié.',
 en:'Response interrupted. The text above is partial and must be checked.',
 es:'Respuesta interrumpida. El texto anterior es parcial y debe verificarse.',
 de:'Antwort unterbrochen. Der obige Text ist unvollständig und muss geprüft werden.',
 it:'Risposta interrotta. Il testo precedente è parziale e deve essere verificato.',
};
const unavailable:Record<Locale,string>={fr:'La réponse de Clara est indisponible.',en:'Clara’s response is unavailable.',es:'La respuesta de Clara no está disponible.',de:'Claras Antwort ist nicht verfügbar.',it:'La risposta di Clara non è disponibile.'};
const timedOut:Record<Locale,string>={fr:'La réponse de Clara a dépassé le délai de génération.',en:'Clara’s response generation timed out.',es:'Se agotó el tiempo de generación de la respuesta de Clara.',de:'Die Generierung von Claras Antwort hat das Zeitlimit überschritten.',it:'La generazione della risposta di Clara ha superato il tempo massimo.'};
export function generationNotice(locale:Locale,generation:ResponseGeneration){
 return generation.recoverable || generation.status==='incomplete' ? notices[locale] : generation.status==='timeout' ? timedOut[locale] : unavailable[locale];
}
