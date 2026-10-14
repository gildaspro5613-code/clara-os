# Réception opérationnelle Clara OS — #175

**Décision : NO-GO pour la réception Production. Issue #175 non clôturée.** Les corrections ciblées sont proposées dans une seule PR Draft ; aucun fournisseur OS n’est certifié réel. Base : `consolidation/clara-os-clean-base`, SHA `781976a3b53d6a8a53d31a892c33168af0b3b4f5`, après merges #173/#174. Audit du 14 octobre 2026, fuseau Europe/Paris.

## Suite P0 — autorité native, 14 octobre 2026

Le défaut `/api/clara/session` qui renvoyait une mission globale sans session valide est corrigé sur la branche de la **PR #176, conservée en Draft**. [Rapport d'autorité native](native-authority.md) : inventaire Mission/Session/Document, contrat exact, migration additive 012 non exécutée en Production, preuves négatives et limites.

**Mesure conservatoire avec restriction de disponibilité :** aucune lecture native sans propriétaire/utilisateur/workspace/client/projet/version attestés ; pages et opérations dépendantes du runtime global verrouillées même après authentification. Historique conservé sans association automatique. Le défaut de confidentialité est corrigé en isolation ; la réception native opérationnelle demeure **NO-GO**.

Résultats de cette suite : **7 tests d'autorité**, **18 lectures PostgreSQL**, **32 refus de handlers**, **2 tests browser/HTTP** (30 visites sans fuite HTML/RSC, 20 refus sans/invalide cookie, 1 token inconnu), **36 tests P0**, **11 canonique/OS↔Live**, **29 documents**, **29 contrats/rendu**, **8 browser UI**. Zéro ignoré. Build, TypeScript et lint ciblé réussis. Même lint global (10 erreurs/14 avertissements) et mêmes échecs Vitest (20 succès, 2 échecs, 1 suite en erreur) que la base, réexécutés séparément.

Les résultats « réception peuplée » ci-dessous sont ceux de la passe **antérieure au verrouillage natif**. Ils ne signifient plus que les pages/opérations globales sont accessibles : les tests métier/UI continuent en isolation avec mocks explicitement signalés, et le vrai serveur est testé négativement. Le registre courant de sécurité fait autorité dans [native-authority.md](native-authority.md) et la section `nativeAuthorityFollowup` de [evidence.json](evidence.json).

## Historique de réception avant barrière native

Les preuves horodatées sont dans [evidence.json](evidence.json). Les résultats locaux ne remplacent jamais une validation Production.

| Parcours | Preuve exécutée | Résultat | Responsable du blocage / action suivante |
|---|---|---|---|
| Authentification OIDC réelle, choix workspace/projet, isolation native multi-utilisateur | Tests sessions/roles/OIDC locaux ; PostgreSQL canonique isolé. Audit du vrai handler `/api/clara/session` avec stockage contrôlé : sans cookie ou avec cookies synthétiques invalides, même mission globale renvoyée (200) | **BLOCKED** en réel et par défaut d’autorité native démontré | Codex + propriétaire : autorité serveur canonique et appartenance explicite mission/session/document→workspace/client/projet. Le modèle `Mission` n’a pas ces identifiants ; ni sélection workspace multiple ni sélection projet native vérifiable. Ne jamais dériver l’appartenance du nom, email, titre ou mission la plus récente |
| Projet, contexte, mission, priorité, journal | Création de deux projets et conflits d’ID réellement testés dans PostgreSQL local ; 11 tests canonique/auth. P0 durable/session : 65 tests combinés, dont tests PostgreSQL | **Validé isolé**, **BLOCKED Production** | Propriétaire : comptes et projets de test authentifiés, associations explicites ; vérifier les traces sur la révision Production effectivement servie |
| Cohérence cockpit/Missions/Conversations | Browser peuplé FR/EN/ES/DE/IT, 6 missions dont 5 actives et focus bloqué ; original retrouvé après navigation | **Validé isolé** | Le cockpit décrit le fil courant ; le registre reste global non certifié. Aucun lien utilisateur/projet inventé. Recette réelle après correction d’autorité |
| Interface cinq langues, états, dates/pluriels | 2 870 messages validés et inventaire des appels statiques ; 29 tests de contrats et rendu, 60 visites à vide + 25 visites peuplées | **Validé isolé**, **BLOCKED réel** | Propriétaire : recette sur le build autorisé en Production. Texte métier source conservé et attribué ; aucune traduction destructrice |
| Nouveaux messages Clara / générations partielles | Vrai composeur + provider simulé, citations/données Brain inchangées ; tests P0 génération partielle/timeouts | **Simulation uniquement** | Accès OpenAI/budget autorisés et comptes/projets de test ; pas de génération fournisseur réelle effectuée |
| Courriels langue destinataire | Nouveaux modèles déterministes basés uniquement sur `intake.source.locale`, testés cinq langues ; relecture conserve langue du brouillon sauf instruction explicite | **Validé isolé**, recette réel **BLOCKED** | La langue du formulaire n’est pas une preuve de préférence personnelle du destinataire. L’opérateur doit vérifier celle-ci. Les anciens brouillons ne sont pas retraduits ; la classification commerciale conversationnelle existante reste principalement française |
| Documents import/lecture PDF/diagnostics/navigation/move/archives | 29 tests, lecteur PDF local réel ; 7 parcours navigateur documents/archives et concurrence PostgreSQL/canonique | **Validé isolé**, **BLOCKED accès/projet Production** | Connexion Google et fichiers/dossiers de test explicitement autorisés. L’API native Documents n’a pas de rattachement explicite au projet OS ni de garde canonique de lecture ; ne pas la déclarer multi-projet isolée. Suppression Drive existe dans l’adapter, pas dans le parcours Documents testé ; aucune suppression réelle |
| Brouillon commercial, approbation et transport | 7 tests continuité commerciale, tests approbation, nouveaux templates cinq langues | **Validé isolé pour préparation**, **BLOCKED envoi réel** | `executeCommercialTransportBoundary` retourne toujours `transport-not-configured` ; aucun transport IONOS implémenté/configurable validé. Ne pas inventer `IONOS_*`. Tout envoi requiert accord explicite et transport gouverné |
| Fermer/reprendre, décisions, contexte et histoire durable | P0 réel PostgreSQL local, séparation produit/user/projet/session externe et maintien des réponses interrompues | **Validé isolé**, **BLOCKED natif multi-utilisateur réel** | Les garanties de clé externe P0 sont préservées ; elles ne rendent pas le fil natif historique `default` automatiquement contextuel |
| Cockpit courriels/action/détails | Browser peuplé + projection metadata-only : expéditeur/objet/importance source/action/lien ; aucun corps ou snippet Gmail dans les synthèses. Brouillon et brief complets déplacés vers Clara | **Validé isolé** | Lien Gmail utilise l’ID source ; compte navigateur et accès réel à ce message restent à vérifier. Aucune priorité Brain inventée pour un email : importance Gmail ou priorité non renseignée |
| Brevo / Make / Google / Microsoft / autres | [Matrice exhaustive](connectors.md), adapters contre doubles, auth/security locaux, aucune lecture fournisseur réelle | **BLOCKED réel / simulation uniquement** | Credentials/connexions workspace autorisées, ressources de test désignées. Make ne propose pas de listing distant ; campagne Brevo PREPARE peut être une écriture |
| Voix locale / session ElevenLabs | Quatre routes testées : 20 requêtes HTTP sur le build local refusées (403) dans cinq langues ; refus opérateur avant I/O, origines POST, messages localisés sans secret. Aucun microphone/fournisseur réel | **Simulation uniquement**, **BLOCKED réel** | Configuration ElevenLabs + opérateur OS/`CLARA_AUTH_APP_ORIGIN` ; permission micro, tests facturables seulement après accord |
| Appels entrants/sortants/historique | Moteur sortant existant audité ; Twilio est une configuration déclarée, l’appel passe via ElevenLabs. Entrant/historique absents de ce code | **BLOCKED**, disponibilité non vérifiée maintenue | Vérifier agent/numéro/compte chez fournisseurs ; pas d’appel/SMS sans accord. Les variables ne créent ni webhook entrant ni historique |
| Vercel Production / révision / variables | Inventaire de 55 noms avec chemins source et présence cloud ; accès équipe 403 rapporté par propriétaire. Lecture publique auth/status inaccessible depuis cloud | **BLOCKED** | Propriétaire : contrôler métadonnées noms/scopes et révision servie. Aucune absence Production inférée de l’absence cloud. Aucun secret lu ni modifié |

## Corrections strictement nécessaires

1. Traduire `STARTING/WORKING/STOPPING/STOPPED`, avec état inconnu sûr ; ajouter `pages.conversations` dans les cinq catalogues. Le test d’inventaire comprend désormais les traductions déclarées dans `Promise.all`, ce qui manquait au test #173.
2. Cockpit : synthèse structurelle localisée et contenu source attribué ; retirer corps de conversation/email/brief complet des synthèses. Métadonnées Gmail seulement, sans snippet/body. Les conversations, détails de qualification et brouillon complet restent consultables dans Clara/Conversations ; aucune donnée source écrasée.
3. Le libellé « aucune mission active » devient « aucune mission sélectionnée dans le fil courant ». Les compteurs sont explicitement ceux du registre global. La page Missions reprend le même focus que le contexte courant ; elle affiche aussi les autres missions actives et ne déguise plus un focus bloqué en mission active, même sans descripteur d’exécution. La reclassification locale de statut sur la seule page Missions est supprimée ; le statut persisté reste la référence commune. Aucun tri/priorité Brain modifié.
4. Préparer les nouveaux brouillons commerciaux dans la langue déclarée du formulaire source. Garder le destinataire, l’identité Mélodie Digital, les faits, la signature, l’approbation et l’interdiction d’envoi. Aucun retraitement de l’historique.
5. Routes voix/téléphonie : réutiliser la session canonique et les droits existants `connections:manage` sur le workspace serveur ; origine HTTPS contrôlée pour POST, aucune confiance dans le workspace fourni par le caller. Supprimer erreurs/details fournisseur bruts ; URL vocale signée réservée à l’opérateur et `no-store`. Moteurs inchangés, aucune identité parallèle.
6. Réparer les deux fixtures Google refresh/invalid_grant, qui recherchaient le workspace historique `default` : elles ciblent maintenant leur `connection.id` explicite. Aucun assouplissement des ACL ni fallback `default` ajouté.

## Tests exécutés avant barrière native

| Suite / contrôle | Résultat |
|---|---|
| i18n + rendu de réception + voix/auth + continuité commerciale + OAuth Google | **29/29**, zéro ignoré |
| Documents/PDF/routes/workspace/archives | **29/29**, zéro ignoré ; PostgreSQL isolé |
| Brevo/Make/GitHub/Stripe/ACL/Google/P0 | **65/65**, zéro ignoré ; providers simulés et PostgreSQL P0 isolé |
| Canonique, concurrence, OIDC/session/ACL | **11/11**, zéro ignoré ; scénario de concurrence comporte 18 ordonnancements/checks locaux OS/Live |
| Fondations/routage matériels | **16/16**, zéro ignoré ; doubles, aucune commande réseau équipement |
| Browser régression vide/documents/archives | **8/8**, dont 60 visites multilingues |
| Browser réception peuplée | **1/1**, 25 visites dans cinq langues, état traduit et contenu original repris ; ouverture/édition du brouillon puis PATCH intercepté, aucune autre mutation ni envoi |
| TypeScript, ESLint ciblé, build webpack | Succès. Police Google simulée uniquement pour le build local. Aucun déploiement |
| Lint global | **Échec préexistant** : 10 erreurs, 14 avertissements ; mêmes diagnostics sur le SHA de base et la branche corrigée |
| Vitest historique | **20 succès, 2 échecs, 1 suite échouée à l’initialisation** ; mêmes 3 fichiers défaillants sur le SHA de base. Décision spécialiste attendue par ancien test, comptage SQL obsolète, mock hoist `dispatchEvent`. Aucun comportement Brain changé pour rendre un ancien test vert |
| Production et fournisseurs | **Non exécutés / bloqués**, jamais assimilés aux simulations |

Les tests navigateur démarrent le build local avec l’URL synthétique exacte `postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic`. Le preload `src/tests/helpers/reception-browser-runtime.mjs` bloque tous les fetchs serveur externes ; le navigateur intercepte les API et bloque les origines externes. Les fixtures ne peuvent pas être démarrées avec une URL DB réelle. Le preload vide est `src/tests/helpers/documents-browser-runtime.mjs`. PostgreSQL est dans les conteneurs `clara-document-registry-test-finalaudit`, `clara-document-registry-test-p0`, `clara-canonical-test-postgres` ; aucune migration Neon/Production.

Commandes :

```sh
node --import tsx --test src/tests/i18n-consolidation.test.ts src/tests/operational-reception.test.tsx src/tests/voice-route-security.test.ts src/tests/commercial-operational-continuity.test.ts src/tests/google-durable-oauth.test.ts
DOCUMENT_ARCHIVE_TEST_CONTAINER=clara-document-registry-test-finalaudit npm run test:documents
DOCUMENT_OPERATION_TEST_CONTAINER=clara-document-registry-test-p0 node --import tsx --test src/tests/production-p0.test.ts src/tests/production-p0-postgres.test.ts src/tests/brevo-connector.test.ts src/tests/make-connector.test.ts src/tests/github-connector.test.ts src/tests/stripe-connector.test.ts src/tests/authenticated-workspace-session.test.ts src/tests/workspace-authorization.test.ts src/tests/microsoft-authenticated-routes.test.ts src/tests/microsoft-workspace-gate.test.ts src/tests/google-durable-oauth.test.ts src/tests/capability-tool-approval.test.ts
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/canonical-registry-postgres.test.ts src/tests/canonical-archive-service.test.ts src/tests/canonical-archive-concurrency.test.ts src/tests/verified-sign-in.test.ts src/tests/sign-in-transaction.test.ts src/tests/authenticated-session-lifecycle.test.ts src/tests/session-request-security.test.ts
node --import tsx --test src/tests/integration/lighting-console-connections-v1.test.ts src/tests/integration/grandma3-lighting-foundation.test.ts src/tests/integration/avolites-titan-foundation.test.ts src/tests/integration/lighting-provider-router-v1.test.ts
```

Serveur de recette peuplée, uniquement local :

```sh
CLARA_WORKSPACE_ID=melodie-digital DATABASE_URL=postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic NODE_OPTIONS="--import=$PWD/src/tests/helpers/reception-browser-runtime.mjs" NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3018
DOCUMENTS_E2E_ORIGIN=http://127.0.0.1:3018 DOCUMENTS_E2E_CHROMIUM=/usr/bin/chromium node --test src/tests/operational-reception-browser.e2e.mjs
```

Les workflows existants i18n/documents exécutent ces nouvelles vérifications sur GitHub, avec un serveur local optimisé et des fixtures synthétiques. Rien n’est exécuté sur Vercel par ces commandes.

## Actions minimales du propriétaire — Vercel Production

1. Résoudre le droit de lecture de l’équipe Mélodie Digital (403) ou faire le contrôle dans le Dashboard avec un compte autorisé. Projet `clara-os` → Settings → Environment Variables : vérifier **nom et target Production** uniquement ; ne pas ouvrir/décrypter/exporter les valeurs. Utiliser [environment-inventory.json](environment-inventory.json) et les groupes de [connectors.md](connectors.md).
2. Contrôler séparément les six noms `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_AGENT_PHONE_NUMBER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. Pour la voix locale TTS, vérifier également `ELEVENLABS_VOICE_ID`. État actuel Production = non vérifié, pas « absent confirmé ». Le moteur sortant utilise les trois noms ElevenLabs ; Twilio doit être correctement lié côté fournisseur.
3. Si un nom manque réellement en Production, le propriétaire récupère la valeur légitime dans le compte fournisseur correspondant et l’entre dans Vercel **uniquement après autorisation explicite de modification**. Ne pas copier une ancienne valeur Preview supposée correcte ni créer un ID fictif. Ne rien transmettre dans le chat, les commits ou le rapport. Aucun changement fait par Codex.
4. Contrôler socle DB/encryption, origine HTTPS OS, workspace et OIDC, puis Brevo et Google/Microsoft. Make/GitHub/Stripe utilisent le stockage de connexion, pas des variables inventées. Tester les refresh tokens et scopes dans la connexion au workspace autorisé.
5. Confirmer Settings → Build and Deployment → Ignored Build Step → **Only build production**. Aucune Preview ne doit être créée. Aucun changement de ce réglage. Vérifier le SHA réellement servi avant de prétendre que la branche de consolidation est la Production.
6. La publication de la PR GitHub ne met pas la Production à jour. Tout redéploiement ou merge reste soumis à un feu vert distinct ; aucune migration ni suppression de données.

## Intervention native identifiée lors de la passe précédente

La correction conservatoire et le statut courant sont maintenant décrits dans [native-authority.md](native-authority.md). Une configuration Vercel ne répare pas la portée des données. Fichiers initialement concernés pour une correction complémentaire explicitement cadrée : `src/lib/core/operational-context.ts`, `src/lib/core/store/session-store.ts`, `src/lib/core/runtime.ts`, `src/modules/missions/mission-store.ts`, `src/modules/missions/types/Mission.ts`, `src/app/api/clara/session/route.ts`, `src/app/api/clara/chat/route.ts`, `src/app/api/documents/route.ts`, pages Missions/Journal et stores d’intake/connexions utilisés par les pages natives.

Contrat à établir : principal issu de la session OIDC existante ; workspace choisi sur membership ; client/projet issus du registre canonique ; fil durable et ressources avec propriétaire explicite. Les ressources historiques sans preuve restent non associées. Aucune déduction à partir du fil le plus récent, nom ou email. Réutiliser les ACL et registry existants, sans introduire d’identité parallèle ; déterminer une association historique manuelle auditée. La garde voix ajoutée ne certifie pas ces ressources.

Avant clôture : démontrer deux vrais comptes et projets distincts, reprise sans confusion, droits expirés/révoqués, accès interdit aux ressources étrangères, lectures fournisseurs autorisées, puis les actions externes spécifiquement autorisées. Les surfaces inexistantes (transport IONOS, entrants/historique Twilio, sélection native multi-workspace/projet) requièrent décision de périmètre ou écart explicitement accepté. Aucun de ces écarts n’a été accepté dans cette mission ; **NO-GO maintenu**.

## Fichiers de la première passe de réception

- `.github/workflows/documents-workspace-validation.yml`
- `.github/workflows/i18n-consolidation-validation.yml`
- `docs/reception-175/README.md`
- `docs/reception-175/connectors.md`
- `docs/reception-175/environment-inventory.json`
- `docs/reception-175/evidence.json`
- `src/app/api/elevenlabs/session/route.ts`
- `src/app/api/telephony/route.ts`
- `src/app/api/voice/speak/route.ts`
- `src/app/api/voice/transcribe/route.ts`
- `src/app/clara/page.tsx`
- `src/app/missions/page.tsx`
- `src/components/clara/ClaraStatus.tsx`
- `src/components/cockpit/panels/AcquisitionQualificationPanel.tsx`
- `src/components/cockpit/panels/BriefPanel.tsx`
- `src/components/cockpit/panels/ConversationsPanel.tsx`
- `src/components/cockpit/panels/EmailSummaryPanel.tsx`
- `src/components/cockpit/panels/SummaryPanel.tsx`
- `src/components/cockpit/panels/TasksPanel.tsx`
- `src/components/cockpit/widgets/CockpitWidgets.tsx`
- `src/components/cockpit/widgets/clara/ClaraChatWidget.tsx`
- `src/components/cockpit/widgets/missions/MissionWidget.tsx`
- `src/i18n/messages/de/commercial-draft.json`
- `src/i18n/messages/de/consolidated-ui.json`
- `src/i18n/messages/de/index.json`
- `src/i18n/messages/en/commercial-draft.json`
- `src/i18n/messages/en/consolidated-ui.json`
- `src/i18n/messages/en/index.json`
- `src/i18n/messages/es/commercial-draft.json`
- `src/i18n/messages/es/consolidated-ui.json`
- `src/i18n/messages/es/index.json`
- `src/i18n/messages/fr/commercial-draft.json`
- `src/i18n/messages/fr/consolidated-ui.json`
- `src/i18n/messages/fr/index.json`
- `src/i18n/messages/it/commercial-draft.json`
- `src/i18n/messages/it/consolidated-ui.json`
- `src/i18n/messages/it/index.json`
- `src/lib/acquisition/commercial-communication-draft.ts`
- `src/lib/auth/voice-request-authorization.ts`
- `src/lib/brain/response-composer.ts`
- `src/lib/presentation/cockpit-summary.ts`
- `src/modules/journal/JournalStage.tsx`
- `src/modules/missions/MissionsStage.tsx`
- `src/modules/missions/components/MissionCard.tsx`
- `src/tests/google-durable-oauth.test.ts`
- `src/tests/helpers/reception-browser-runtime.mjs`
- `src/tests/i18n-consolidation.test.ts`
- `src/tests/operational-reception-browser.e2e.mjs`
- `src/tests/operational-reception.test.tsx`
- `src/tests/voice-route-security.test.ts`
