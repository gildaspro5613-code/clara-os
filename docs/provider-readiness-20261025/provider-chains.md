# Chaînes existantes : premier maillon sans preuve suffisante

Les confirmations du propriétaire (mission du 25 octobre, §4) sont retenues comme
**fonctionnement réel historique** de Google/Agenda/Drive et des échanges vocaux.
Leur SHA/environnement/date d’exécution détaillés ne sont pas fournis : ne pas les
inventer et ne pas les remplacer par les anciennes réserves d’audit. L’absence d’une
nouvelle recette n’est pas une régression. Le candidat actuel ajoute des preuves
isolées, pas une nouvelle preuve réelle.

## Drive / Documents / Brain

Commande dans Clara/Documents → `nativeRequest/withNativeScope` → autorité Google
native et connexion explicitement sélectionnée → `NativeDocuments`, `DriveClient`
→ SDK Google existant → contrat `clara.document-analysis.v1`, sources/version et
reçu chiffré du ledger existant → `DOCUMENT_RECEIVED` atomique → contexte mission,
Brain, Documents, Journal et Cockpit.

Preuves : `native-document-continuity-postgres.test.ts`, parcours documentaire et
reprise navigateur ; historiques `196a00f`, `2e5af68`, `b40386f`. Premier maillon
réel restant : accès/consentement effectifs **de l’instance candidate**, pas défaut
Google constaté. Recherche native limitée aux références autorisées : ne pas annoncer
une recherche globale Drive sans preuve du périmètre et de l’implémentation.

## Agenda

Page Agenda/Cockpit → scope canonique et calendrier explicite →
`NativeGoogleWork` → SDK Calendar → événements lus ; pour
mutations : proposition figée, confirmation, contrôle de version →
`clara_native_google_work_command`, reçus `native-google` et approbations existantes
→ `GOOGLE_WRITE_COMPLETED`/échec/incertitude → Journal/Cockpit.

Preuves : `native-google-work-postgres.test.ts`, navigateur Google historique,
consultation J1 simulée. Premier maillon réel restant : consultation du calendrier
choisi sur le candidat avec accès existants. Les lectures Agenda ne sont pas
présentées comme ayant toutes un reçu durable de consultation ; les mutations
réceptionnées ont leurs reçus et événements. Aucun nouveau consentement présumé requis.

## IONOS

Messagerie/Clara → `nativeMailCommand` et identité de boîte révocable →
`CredentialStore`, `NativeMail` → `IonosReadTransport` (surveillance) ou
`IonosTransport` existants, IMAP TLS/SMTP TLS → cursors/messages chiffrés, liaison
contact/mission, brouillon versionné → approbation exacte et single-use → opération
persistée `pending/approved/processing/sent/failed/uncertain` → `MAIL_*` Journal et
projection Cockpit (`b40386f`, inchangée ici).

Preuves : `native-mail-postgres.test.ts`, `ionos-transport.test.ts`, relève 022/023,
navigateur J1/reprise. Premier maillon réel restant : activation **ponctuelle
explicitement autorisée** du transport sur les credentials et autorités déjà
provisionnés, dont les valeurs ne sont pas consultées ici. Ne pas affirmer qu’ils
sont absents. La lecture/préparation ne confère pas le droit d’envoyer. Autonomie
inactive ; aucune opération réelle ou relance n’est effectuée dans ce lot.

L’avis Nodemailer sur parsing des adresses était une réserve réelle ; les versions
compatibles sont corrigées. Cela ne certifie pas à lui seul SMTP ou sa livraison.

## Make et Brevo

Appel de capacité → politique et approbation `CapabilityToolBridge` →
`MakeCapabilityExecutor` (workspace, connexion active et scope scenarioKey) →
`MakeExecutableConnector` → `MakeConnectorAdapter`/`MakeWebhookClient` → webhook
Make issu du CredentialStore → résultat provider (`contactId/messageId` si renvoyé).

Le client conserve le wrapper existant `{scenarioKey,payload,source}` et les champs
retournés. Les nouveaux correctifs refusent les échecs contradictoires, n’infèrent
plus une complétion d’un simple 2xx et n’autorisent pas le retry automatique d’un
POST ambigu. L’audit générique ne marque plus `SUCCEEDED` un simple ack Make non
terminal. La préparation reste sans effet externe, les politiques ne sont pas ouvertes.

**Premier maillon bloquant depuis le parcours natif :** fence explicite des routes
Make/Brevo et absence de chemin reçu depuis le contexte natif jusqu’au résultat métier
persisté dans Contacts/Mission/Journal. Le catalogue autorise des clés ; il n’établit
pas la correspondance réelle 7294540/7291299 → clé → champs de webhook. Les scenarii
existent ; leurs entrées sont connues du propriétaire, leur mapping dans le wrapper
et la conservation des IDs métier ne sont pas attestés dans le code reçu.

`clara_tool_audit` est un audit d’outil, pas un reçu canonique du contact/mission.
Il ne faut pas confondre les deux. La gateway produit `/api/external/capabilities`
possède une autorité produit distincte ; l’utiliser ne remplace pas le consentement
natif du propriétaire. Aucun contournement de ce type n’est proposé.

La levée sûre du fence doit raccorder les autorités et registres **existants** et
recevoir la révocation, la concurrence et la reprise/dédoublonnage métier. La
présence du connecteur/scénario ne suffit pas ; aucun nouveau moteur/scénario ne
sera créé pour masquer cet écart. Brevo direct existant reste également préservé.

## Voix / téléphonie

Interface existante → `authorizeVoiceRequest` (session canonique, workspace serveur,
permission `connections:manage`, même origine pour mutation) → routes
`/api/elevenlabs/session`, `/api/voice/speak`, `/api/voice/transcribe` ou
`/api/telephony` → `TelephonyEngine` existant / SDK ElevenLabs → fournisseur
Conversational AI et Twilio → identifiants de session/conversation/callSid.

Les noms sécurisés `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`,
`ELEVENLABS_AGENT_PHONE_NUMBER_ID`, `ELEVENLABS_VOICE_ID` et références Twilio sont
conservés. Aucune valeur lue/rotée, aucun diagnostic « clé cassée » sans preuve.
Le moteur sortant utilise ElevenLabs → Twilio ; `twilioConfig` seul ne crée pas un
webhook entrant ni une transcription persistée.

**Premier maillon UI restant :** fermeture préexistante de la page Téléphonie et
du Hero natif. Le bouton était désactivé, mais Entrée pouvait appeler le handler :
ce contournement est corrigé, sans réactiver le service. **Premier maillon métier
non reçu :** autorité mission/session/projet, reçu durable idempotent de tentative,
Journal, transcription/reprise. Les identifiants provider ne prouvent pas ces étapes.

Le transport réel historique n’est pas qualifié de défaillant. Le correctif sur un
HTTP 200 vide protège une fausse déclaration de départ sans changer URL, auth,
agent/numéro ou provider. Aucun nouveau raccord voix OS↔Live n’est introduit.
