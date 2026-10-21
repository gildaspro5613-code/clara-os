import type {MailContent} from '@/lib/connectors/ionos/transport';

/** Advisory triage only. Untrusted mail cannot authorize sending, deletion,
 * forwarding, contact creation, external requests, or privilege changes.
 * A "high" flag is a request for human attention, not verified urgency. */
export type MailPriority = 'high'|'normal'|'low'|'quarantine';
export type MailCategory = 'security'|'support'|'commercial'|'scheduling'|'administrative'|'newsletter'|'general';
export type MailTriage = {priority:MailPriority;category:MailCategory;reason:string;requiresAttention:boolean};

export function triageMail(
 mail:Pick<MailContent,'subject'|'from'|'text'|'quarantined'>,
 mailboxAddress:string,
):MailTriage {
 if(mail.quarantined)return {priority:'quarantine',category:'security',reason:'unsafe-attachment',requiresAttention:true};
 const subject=mail.subject.normalize('NFKC').toLowerCase().slice(0,300);
 const excerpt=mail.text.normalize('NFKC').toLowerCase().slice(0,1500);
 const source=mail.from.toLowerCase();
 const bulk=/(?:newsletter|unsubscribe|désabonner|se désabonner|abmelden|abbona(?:mento|ti)|cancelar suscripci[oó]n|promotion|promoci[oó]n|werbung|publicit[eé]|black friday)/i;
 if(bulk.test(subject)||(/(?:no-?reply|newsletter)@/.test(source)&&bulk.test(excerpt)))
  return {priority:'low',category:'newsletter',reason:'bulk-message',requiresAttention:false};
 // A claimed urgency by itself is NOT enough to trigger a critical alert.
 const incident=/(?:panne|indisponib|incident technique|interruption de service|service down|outage|system failure|ausfall|störung|guasto|interruzione del servizio|aver[ií]a|ca[ií]da del servicio)/i;
 if(incident.test(subject)||incident.test(excerpt.slice(0,350)))
  return {priority:'high',category:'support',reason:'potential-incident',requiresAttention:true};
 const security=/(?:phishing|fraude|fraud|compromis|compromised|piratage|account breach|security incident|sicherheitsvorfall|violaci[oó]n de seguridad|violazione di sicurezza)/i;
 if(security.test(subject))
  return {priority:'high',category:'security',reason:'potential-security-issue',requiresAttention:true};
 const commercial=/(?:demande de devis|appel d.offres|proposition commerciale|request for (?:a )?quote|quotation request|request for proposal|tender|angebot(?:sanfrage)?|kostenvoranschlag|preventivo|richiesta di offerta|presupuesto|solicitud de presupuesto)/i;
 if(commercial.test(subject)||commercial.test(excerpt.slice(0,350)))
  return {priority:'high',category:'commercial',reason:'commercial-request',requiresAttention:true};
 const deadline=/(?:mise en demeure|échéance|deadline|payment overdue|facture impay[eé]e|zahlungserinnerung|fristablauf|scadenza|vencimiento|plazo de entrega)/i;
 if(deadline.test(subject))
  return {priority:'high',category:'administrative',reason:'possible-deadline',requiresAttention:true};
 const mailbox=mailboxAddress.toLowerCase();
 if(mailbox.startsWith('support@'))return {priority:'normal',category:'support',reason:'support-inbox',requiresAttention:false};
 if(mailbox.startsWith('contact@')||mailbox.startsWith('clara@'))return {priority:'normal',category:'commercial',reason:'commercial-inbox',requiresAttention:false};
 const scheduling=/(?:rendez-vous|meeting|appointment|réunion|terminvereinbarung|riunione|reuni[oó]n)/i;
 if(scheduling.test(subject))return {priority:'normal',category:'scheduling',reason:'appointment',requiresAttention:false};
 return {priority:'normal',category:'general',reason:'unclassified',requiresAttention:false};
}
