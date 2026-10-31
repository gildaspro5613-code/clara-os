# PR #223 — Réception fonctionnelle finale ciblée

Branche : `fix/historical-cockpit-restoration-20261031`. Référence applicative : `5c7d4c1a64d3c09af44b32da6109628f13f38081`. Aucun changement de code applicatif, de présentation, de permission, de contrat, de connecteur ou de base distante.

## Tableau de décision

| Fonction | Fonction vérifiée / niveau de preuve | Blocage réel ou réserve | Correctif strictement nécessaire |
|---|---|---|---|
| Voix ElevenLabs du Cockpit natif | Garde conservé et testé dans les cinq langues ; clic sur contrôles désactivés : zéro accès micro et zéro requête voix. Autorisation opérateur des routes historiques vérifiée. Contrat OS↔Live d'association testé en PostgreSQL. | **BLOQUÉE pour activation native.** Le widget n'est pas raccordé à l'autorité vocale par projet, aux tours natifs durables, à la reprise ni à un arrêt fournisseur attesté après révocation. Les preuves historiques de transport vocal réel restent conservées et ne sont pas déclarées invalides. | Ne pas supprimer `disabled={nativeScope}`. Raccorder ce composant aux autorités et historiques vocaux existants puis démontrer persistance/reprise/arrêt actif. Une URL signée opérateur ou `conversation:link` ne suffit pas. Aucun nouveau parcours n'est inventé ici. |
| Agenda Google | **TESTÉ EN ISOLATION** : widget → `/api/calendar` → garde natif → NativeGoogleWork → CalendarClient. Calendrier explicitement lié, rôle Google `reader`, événement affiché ; rechargement et vues desktop/mobile. | Réception du fournisseur réel non exécutée. Les refus de rôle, de consentement, d'acteur, d'absence de session et de révocation sont démontrés. Une panne n'est pas affichée comme un agenda vide. | Aucun défaut applicatif reproduit. Pour une réception réelle : utiliser la connexion et le calendrier existants autorisés, sous GO fournisseur ; aucune reconfiguration présumée. |
| Météo | **INDISPONIBILITÉ VÉRIFIÉE** : WeatherWidget → `/api/weather?location=Angers` → WeatherEngine. Absence volontaire de clé dans le processus de test : 502 et libellé localisé, aucun faux 0 °C. | Prévision fournisseur réelle **NON CERTIFIÉE** dans ce lot. Le test local ne prouve pas une clé absente ou une panne en Production. | Aucun changement logiciel démontré nécessaire. Essai de lecture WeatherAPI avec la configuration existante seulement après autorisation. |
| Waze | **PRÉPARATION LOCALE VÉRIFIÉE** : widget → `/api/waze` → WazeEngine, URL réelle `https://waze.com/ul` avec destination encodée. Ouverture navigateur testée, accès externe bloqué ; 503 simulé affiché comme indisponible. | Navigation effective chez Waze non certifiée. Le moteur prépare un lien ; il ne contacte pas une API Waze ni ne calcule un itinéraire. | Aucun correctif logiciel nécessaire constaté. Vérifier l'ouverture finale avec le propriétaire lorsque cet essai est autorisé. |
| GlassPanel Mission | **TESTÉ FR/EN/ES/DE/IT** : Progression, Étape suivante et absence d'action suivante ; titre, objectif et prochaine action conservés dans leur langue source. Recette 15 combinaisons langue/format. | Les anciennes captures techniques contenaient une donnée de fixture, pas un libellé codé dans l'application. | Correction des futures données synthétiques de démonstration uniquement : « Préparer la prestation d’Angers ». Aucun titre enregistré n'est traduit, filtré ou renommé par l'application. |
| Messagerie | **TESTÉE EN ISOLATION** : MailOverviewPanel → GET natif overview → autorités de boîtes/projet → données synchronisées → `/messagerie`. Handlers, services et PostgreSQL réels ; IMAP/SMTP simulés. Boîtes autorisées, délégation, approbation, Journal, reprise et résultat incertain sans répétition couverts. | Connexion fournisseur réelle non recertifiée. L'aperçu enregistré signale sa fraîcheur non vérifiée. Boîte indisponible, aucun message signalé et aucune boîte autorisée restent des états distincts. | Aucun défaut applicatif reproduit. Réception IMAP contrôlée avec les autorités existantes avant tout essai réel ; aucun monitoring ni SMTP autonome activé. |

## Voix : cause précise du maintien du garde

Sources :

- `src/components/cockpit/Stage.tsx` : le widget reçoit `disabled={nativeScope}`.
- `src/components/cockpit/widgets/voice/ClaraVoiceWidget.tsx` : getUserMedia, URL signée, puis `Conversation.startSession`. Les callbacks présents sont connect/disconnect/error/mode ; pas de raccordement des tours au stockage natif, de restauration d'un identifiant de conversation durable ou de notification de révocation vers l'arrêt SDK.
- `src/app/api/elevenlabs/session/route.ts` et `src/lib/auth/voice-request-authorization.ts` : autorité opérateur `connections:manage` du workspace serveur, pas une attestation complète de la mission/projet/session Live de ce widget. La garde Recette refuse le fournisseur avant transport.
- `docs/voice/conversation-link-v1.md`, `src/lib/canonical/conversation-links.ts`, `/api/native/conversation-links`, `/api/core/canonical/conversations` : `conversation:link` est distinct de `voice:conversation`. Le reçu d'arrêt porte l'association ; il déclare explicitement `providerSession: not_established_by_this_capability`. Une session vocale enregistrée sans contrôle fournisseur empêche ce reçu, même si son état en base dit stopped.

Ces mécanismes d'association, expiration, révocation, reprise et reçus existent et sont préservés. Ils ne prouvent pas l'arrêt d'un flux ElevenLabs. Aucune preuve du parcours commun « autorisation vocale → tours natifs persistés → reconnexion → arrêt fournisseur après révocation » n'est acquise pour ce composant. Le maintien du garde est donc nécessaire ; cela ne déclare pas en panne la téléphonie/voix historiquement utilisée.

Historique conservé : `docs/delivery-v1-20261025/acquis.csv`, `fournisseurs.csv`, README et `docs/reception-175/connectors.md`. Le propriétaire avait confirmé des appels réels ; leur SHA précis n'est pas inventé et ils ne sont pas remplacés par les simulations du présent lot. Le checkout Live n'étant pas présent ici, aucun code Live n'est modifié ni présumé inspecté au-delà des contrats et preuves versionnés dans OS.

## Agenda : permissions et indisponibilités

AgendaWidget utilise `todayCalendarUrl()` (journée locale du navigateur convertie en bornes ISO). `/api/calendar` appelle `nativeOperationFence(request,'google-calendar-read')`, exige connexion et calendrier explicitement sélectionnés et liés au projet, puis vérifie consentement, identité Google, ressource, rôle lisible et droits actualisés avant/après lecture.

Le profil de consentement Agenda existant exige `calendar.calendarlist.readonly` et `calendar.events`. Le rôle `reader` suffit à la lecture du calendrier ; cela ne signifie pas qu'un autre profil OAuth uniquement readonly est accepté par le contrat actuel. Aucun scope ni privilège n'est élargi dans ce lot.

La recette réduit le rôle à freeBusyReader, retire le consentement attendu, change d'acteur, retire la session puis révoque par la commande native existante `/api/connections/google` ; refus 401/403. Le service fournisseur simulé indisponible produit une erreur visible, pas « aucun rendez-vous ». Les écritures chez le fournisseur restent à zéro.

## Mission et captures destinées à la validation graphique

L'ancienne chaîne `HISTORICAL_AUTHORIZED_MISSION` venait uniquement de `src/tests/historical-production-cockpit-browser.e2e.mjs`. La correction change la création de la future mission synthétique et ses assertions, pas TasksPanel ni les données existantes. Les libellés de TasksPanel utilisent déjà le catalogue cockpitUi, testé dans les cinq langues. Les titres et actions d'origine restent volontairement identiques entre locales.

Galerie de validation, données fictives explicitement identifiées :

- [Cockpit desktop](visual/fr-desktop.png), [tablette](visual/fr-tablet.png), [mobile](visual/fr-mobile.png).
- [Agenda autorisé desktop](capabilities/desktop-agenda.png), [mobile](capabilities/mobile-agenda.png).
- Autres locales et vues des widgets dans `visual/` ; aucune nouvelle présentation.

Les captures conversationnelles techniques avec génération simulée sont rangées dans `technical/` et ne sont pas proposées comme validation graphique ni certification fournisseur. Les anciens dossiers de preuves restent intacts.

## Résultats et périmètre des modifications

- 29 tests PASS, 1 NON EXÉCUTÉ : le sous-test bilatéral Live HTTP/Mongo opt-in n'a pas été relancé dans cet environnement. Les preuves historiques restent réutilisables dans leur périmètre ; ce skip ne devient jamais une certification vocale.
- Trois recettes navigateur HTTPS PASS : capacités ciblées, Cockpit cinq langues × trois formats, messagerie native.
- TypeScript et lint ciblé PASS. Le bundle applicatif optimisé reçu de 5c7d4c1a est réutilisé, code applicatif identique ; aucun rebuild superflu annoncé.
- Réseau métier réel interdit ; PostgreSQL jetable et véritables endpoints/services OS, fournisseurs Google/IMAP/SMTP simulés. Waze ne prépare qu'un lien ; météo volontairement sans clé dans le processus de test.
- Fichiers modifiés : deux tests historiques (libellés/fixtures), nouveau test `cockpit-capabilities-browser.e2e.mjs`, intégration dans le workflow Native Authority existant et ce dossier. Aucun fichier applicatif, traduction, ACL, API, contrat, moteur, migration ou configuration fournisseur modifié.

Résultats exacts dans results.txt. GO pour la réception isolée des parcours ouverts ; **NO-GO activation de la voix native** tant que le parcours commun ci-dessus n'est pas démontré. Aucun GO Production, merge, migration ou déploiement donné ou exécuté.
