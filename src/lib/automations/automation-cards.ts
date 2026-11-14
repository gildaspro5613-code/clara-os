/** Presentation-only audit of existing Clara OS entry points.
 * Statuses describe certified native functionality, never the mere existence
 * of a legacy capability handler or a connected external service.
 * No external invocation is performed by this catalog.
 */
export const automationCards=[
 {key:'calendar',href:'/agenda',status:'scoped'},
 {key:'documents',href:'/documents',status:'scoped'},
 {key:'email',href:'/messagerie',status:'review'},
 {key:'brevo',href:'/connexions',status:'uncertified'},
 {key:'make',href:'/connexions',status:'uncertified'},
] as const;
export type AutomationCardKey=typeof automationCards[number]['key'];
type CardText={title:string;description:string;action:string};
type Copy={intro:string;heading:string;disclaimer:string;statuses:{scoped:string;review:string;uncertified:string};cards:Record<AutomationCardKey,CardText>};
const localized:Record<'fr'|'en'|'es'|'de'|'it',Copy>={
fr:{
 intro:'Accédez aux espaces de travail existants. Les automatisations externes restent soumises aux autorisations et à la certification.',
 heading:'Espaces et connecteurs',
 disclaimer:'Ouvrir une carte ne lance aucune automatisation. Les connexions et droits sont vérifiés dans chaque espace.',
 statuses:{scoped:'Accès encadré',review:'Validation requise',uncertified:'Non certifié'},
 cards:{
  calendar:{title:'Agenda',description:'Consulter les calendriers sélectionnés ; les modifications exigent les autorisations natives.',action:'Ouvrir l’agenda'},
  documents:{title:'Documents',description:'Consulter les documents autorisés. Les opérations Drive ne sont pas ouvertes par cette carte.',action:'Ouvrir les documents'},
  email:{title:'E-mails',description:'Lire les boîtes autorisées et préparer des brouillons. Aucun envoi automatique.',action:'Ouvrir la messagerie'},
  brevo:{title:'Brevo',description:'Les campagnes et envois Brevo ne sont pas certifiés depuis le chat natif.',action:'Voir les connexions'},
  make:{title:'Make',description:'Les scénarios externes ne sont pas exécutables depuis cette page. Vérification native requise.',action:'Voir les connexions'}
 }
},
en:{
 intro:'Open existing workspaces. External automations still require authorization and certification.',
 heading:'Workspaces and connectors',
 disclaimer:'Opening a card does not start an automation. Each workspace checks its own permissions and connections.',
 statuses:{scoped:'Scoped access',review:'Approval required',uncertified:'Not certified'},
 cards:{
  calendar:{title:'Calendar',description:'View selected calendars. Changes require native authorization.',action:'Open calendar'},
  documents:{title:'Documents',description:'View authorized documents. This card does not enable Drive actions.',action:'Open documents'},
  email:{title:'Email',description:'Read authorized mailboxes and prepare drafts. No automatic sending.',action:'Open mail'},
  brevo:{title:'Brevo',description:'Brevo campaigns and sending are not certified from native chat.',action:'View connections'},
  make:{title:'Make',description:'External scenarios cannot run from this page. Native verification is required.',action:'View connections'}
 }
},
es:{
 intro:'Acceda a los espacios existentes. Las automatizaciones externas requieren autorización y certificación.',
 heading:'Espacios y conectores',
 disclaimer:'Abrir una tarjeta no ejecuta ninguna automatización. Cada espacio comprueba sus permisos.',
 statuses:{scoped:'Acceso limitado',review:'Requiere aprobación',uncertified:'No certificado'},
 cards:{
  calendar:{title:'Agenda',description:'Consultar calendarios seleccionados. Los cambios requieren autorización nativa.',action:'Abrir agenda'},
  documents:{title:'Documentos',description:'Consultar documentos autorizados. Esta tarjeta no habilita acciones de Drive.',action:'Abrir documentos'},
  email:{title:'Correos',description:'Leer buzones autorizados y preparar borradores. Sin envío automático.',action:'Abrir correo'},
  brevo:{title:'Brevo',description:'Las campañas y los envíos Brevo no están certificados en el chat nativo.',action:'Ver conexiones'},
  make:{title:'Make',description:'No se pueden ejecutar escenarios externos desde esta página.',action:'Ver conexiones'}
 }
},
de:{
 intro:'Öffnen Sie bestehende Arbeitsbereiche. Externe Automationen benötigen Berechtigung und Zertifizierung.',
 heading:'Arbeitsbereiche und Konnektoren',
 disclaimer:'Das Öffnen einer Karte startet keine Automation. Berechtigungen werden im jeweiligen Bereich geprüft.',
 statuses:{scoped:'Begrenzter Zugriff',review:'Freigabe erforderlich',uncertified:'Nicht zertifiziert'},
 cards:{
  calendar:{title:'Kalender',description:'Ausgewählte Kalender einsehen. Änderungen benötigen native Berechtigungen.',action:'Kalender öffnen'},
  documents:{title:'Dokumente',description:'Autorisierte Dokumente einsehen. Diese Karte aktiviert keine Drive-Aktionen.',action:'Dokumente öffnen'},
  email:{title:'E-Mail',description:'Autorisierte Postfächer lesen und Entwürfe erstellen. Kein automatischer Versand.',action:'Postfach öffnen'},
  brevo:{title:'Brevo',description:'Brevo-Kampagnen und Versand sind im nativen Chat nicht zertifiziert.',action:'Verbindungen ansehen'},
  make:{title:'Make',description:'Externe Szenarien können hier nicht ausgeführt werden.',action:'Verbindungen ansehen'}
 }
},
it:{
 intro:'Apri gli spazi di lavoro esistenti. Le automazioni esterne richiedono autorizzazione e certificazione.',
 heading:'Spazi e connettori',
 disclaimer:'Aprire una scheda non avvia automazioni. Ogni spazio verifica i propri permessi.',
 statuses:{scoped:'Accesso limitato',review:'Approvazione richiesta',uncertified:'Non certificato'},
 cards:{
  calendar:{title:'Agenda',description:'Consultare i calendari selezionati. Le modifiche richiedono autorizzazioni native.',action:'Apri agenda'},
  documents:{title:'Documenti',description:'Consultare documenti autorizzati. Questa scheda non abilita azioni Drive.',action:'Apri documenti'},
  email:{title:'E-mail',description:'Leggere le caselle autorizzate e preparare bozze. Nessun invio automatico.',action:'Apri posta'},
  brevo:{title:'Brevo',description:'Campagne e invii Brevo non sono certificati nella chat nativa.',action:'Vedi connessioni'},
  make:{title:'Make',description:'Gli scenari esterni non possono essere eseguiti da questa pagina.',action:'Vedi connessioni'}
 }
}};
export function automationCopy(locale:string):Copy{
 return localized[locale as keyof typeof localized]??localized.fr;
}
