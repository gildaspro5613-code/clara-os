# Correction P1 — association explicite contact / mission

22 octobre 2026. **GO pour le correctif P1 en isolation. Production : NO-GO.** Aucun push, merge, déploiement, fournisseur réel ou changement de base distante.

## Référence

Base vérifiée : #199 Draft `d3dbe8effb9812ad3b07c4287550172ec9a72d49`, descendante de #176 Draft `22ee77e03701c6d581678a5b309a431074d7e7b7`. Branche locale dédiée `fix/native-mission-contact-p1-20261022`, checkout `/workspace/clara-os-core-reception`. Les branches des deux PR et le checkout IONOS V1 restent inchangés. Aucun changement Twilio, ElevenLabs, Clara Live ou transport courrier.

## Cause et correctif

`selectAcquisition` refusait toute première sélection de contact dès qu’une mission était présente. Cette condition protégeait le contexte actif du fil mais interdisait aussi un rattachement métier légitime.

Le correctif réutilise **Mission.acquisitionSubmissionId**, les attestations canoniques existantes, le contexte natif et le commit Session/Mission/Journal. Aucun nouveau store, Brain, registre ou identité.

- **Mission sans contact, fil vide et sans contexte Brain/documentaire** : sélection explicite du contact autorisé, association à la même mission et activation du contact dans le même fil. Identifiants de mission/session conservés.
- **Mission avec conversation ou contexte existant** : action distincte `associateMissionContact` avec `missionId`, `submissionId`, `approve:true`, confirmation UI. Seule l’association métier change. Anciennes transcriptions, Brain, sources, références et contact actif du fil restent inchangés. L’UI demande un nouveau fil pour utiliser le contact dans la conversation ; sélectionner le contact puis reprendre explicitement la même mission ne transfère aucun ancien message.
- `selectAcquisition` conserve **HTTP 409 NATIVE_NEW_SESSION_REQUIRED** sur l’ancien fil utilisé. Remplacer un contact déjà lié, viser une autre mission que celle ouverte, ou sortir des droits propriétaire/workspace/client/projet reste refusé.
- Même paire mission/contact rejouée : même association et un seul événement métier `MISSION_CONTACT_ASSOCIATED`. Deux contacts concurrents : un commit et un conflit de révision ; aucun écrasement silencieux.
- Un autre fil existant pointant vers la même mission reçoit la référence métier actualisée via le mécanisme natif existant, **sans activer automatiquement le contact dans son contexte de conversation**.

Le contexte opérationnel continue de résoudre le contact actif depuis la Session native, pas depuis une supposition sur le dernier contact de la mission. Les deux notions ne sont donc pas confondues.

## Garantie SQL et migration additive 025

`025_native_mission_contact_association.sql` étend le point d’entrée SQL existant, sans nouvelle table ni backfill. La version précédente de sa fonction est conservée comme dépendance interne. Le contrat natif v2 reste compatible ; la capacité de rattachement annonce `missionContactProtocolVersion:1`. Sans cette migration, le nouveau rattachement refuse l’opération avant écriture.

Dans **la même transaction** que le commit existant :

1. Verrou workspace-first et résolution native de l’acteur.
2. Vérification de la mission actuellement ouverte, du changement unique de son contact et de l’absence d’autres modifications contextuelles dans cette opération.
3. Verrouillage et revalidation de l’attestation du contact : propriétaire, workspace, client, projet, révocation et snapshot attendu.
4. Refus d’activer le contact sur un fil avec messages durables, cache conversationnel, Brain, recommandations, sources ou références documentaires.
5. Commit natif existant : droits de gestion frais, CAS Session, attestations Mission, Journal et historique atomiques.

Une mutation d’un contact de mission existante sans le marqueur interne de rattachement est refusée. Ce marqueur est produit par le serveur ; il n’est pas accepté dans les champs HTTP client. Une simple seconde lecture hors transaction n’est pas présentée comme une garantie.

Les fonctions restent SECURITY INVOKER. PUBLIC n’obtient aucun EXECUTE. Les EXECUTE explicitement accordés avant la migration sont conservés sur la dépendance renommée et recopiés sur l’entrée publique, sans privilège administrateur. Pour des grants créés **après** migration, le rôle applicatif doit pouvoir exécuter les deux fonctions :

- `clara_native_runtime_command(text,text,text,text,text,text,jsonb)` ;
- `clara_native_runtime_command_pre_mission_contact(text,text,text,text,text,text,jsonb)`.

Les droits tables/attestations/audit sont ceux du runtime existant. Le rôle applicatif n’a pas à créer de table, schéma ou fonction. Le test documentaire avec rôle non propriétaire a été complété pour déclarer ce nouvel EXECUTE de dépendance ; ses refus sans droits d’écriture sont conservés.

025 dépend de la version runtime de 019 ; elle s’applique après les migrations antérieures requises par la cible. La migration Voice 024 est indépendante de ce raccord et n’est pas modifiée. **Aucune migration distante effectuée.** Réapplication locale testée, permissions explicites conservées, PUBLIC toujours refusé.

## Réception exécutée

Preuves locales : `/workspace/mission-contact-p1-evidence/`.

| Contrôle | Résultat | Preuve |
|---|---|---|
| 34 contrôles natifs/sécurité de la réception précédente | **34 PASS, 0 FAIL, 0 SKIP** | `regression-34.log` |
| Nouveaux contrôles PostgreSQL P1, sous-tests compris | **10 PASS, 0 FAIL, 0 SKIP** | `targeted-final.log` |
| i18n, erreurs et cohérence des cinq langues | **7 PASS** | `i18n.log` |
| Parcours commercial existant contact → mission → Clara → Journal → Cockpit | **PASS navigateur** | `browser-core.log` |
| Conversations : idempotence, acquittement perdu, >100 messages, refresh | **PASS navigateur** | `browser-core.log` |
| Contacts création/édition, courrier simulé 101 messages et pièces jointes | **PASS navigateur** | `browser-closure.log` |
| Cockpit et capacités non certifiées indisponibles | **PASS navigateur** | `browser-cockpit.log` |
| Nouveau parcours mission → contact ; historique conservé ; nouveau fil explicite | **PASS navigateur sur build final** | `browser-grouped-final.log` |
| Sélections canoniques, pages FR/EN/ES/DE/IT, refus inter-utilisateurs/projets | **PASS navigateur sur build final** | `browser-grouped-final.log` ; également `browser-runtime-diagnostic.log` |
| Arrêt réel du processus Next, redémarrage, même mission/contact, ancien fil intact, cinq pages | **PASS HTTP et navigateur sur build final** | `restart-final.log` |
| TypeScript, lint ciblé et build Next | **PASS** | `tsc-final.log`, `lint-final.log`, `build-final.log` |

Au total : cinq recettes navigateur existantes rejouées, une nouvelle recette P1 et une recette de redémarrage, soit **sept scénarios distincts** réussis. Les contrôles SQL et les recettes navigateur ne sont pas confondus.

La preuve SQL finale (`persistence-proof.json`) montre deux identifiants de session distincts pour **le même identifiant de mission** : ancien fil avec 2 messages, aucun contact actif et un événement d’association ; nouveau fil avec contact actif, 0 ancien message transféré. Le contact métier de la mission est identique des deux côtés. Le Journal reste de portée native : son événement d’association demeure dans le fil initiateur, sans copie artificielle dans le nouveau fil.

### Échecs conservés et limites

- Première version du nouveau test Contacts : lecture avant fin du fetch asynchrone. Ajout de l’attente de l’élément réel ; assertion conservée. Nouveau scénario ensuite réussi, notamment lors de l’exécution groupée finale.
- Deux exécutions navigateur initiales ont reçu un **HTTP 503** dans la recette multilingue, dont une sur `es /clara`. Elles restent visibles dans `browser-core.log` et `browser-recheck.log`. Aucun correctif métier n’a été ajouté pour masquer ce résultat. Le contrôle seul puis la dernière exécution groupée sur le build final passent. **La cause des deux 503 n’est pas démontrée** : ne pas les qualifier arbitrairement de régression applicative ni de défaut préexistant. Le proxy diagnostique conserve ses observations ; la disponibilité continue de l’infrastructure déployée n’est pas certifiée par ces essais locaux.
- Les tests de développement initiaux ont aussi refusé une tentative de réactiver une attestation révoquée : la fixture utilise désormais une nouvelle attestation explicite, sans désactiver le trigger d’immuabilité.
- Authentifications synthétiques canoniques, PostgreSQL local et véritables pages/handlers/stores. Fournisseurs LLM, Google et courrier simulés. Aucun test fournisseur ou Production annoncé réussi.
- Aucun workflow GitHub exécuté ou résultat CI inventé pour ce commit local non publié. Le workflow natif existant est seulement complété pour les nouveaux tests et leur reprise ; aucun workflow ou service supplémentaire.

## Fichiers modifiés

1. `.github/workflows/native-authority-validation.yml` — nouveaux tests dans le workflow existant, sans déploiement.
2. `db/migrations/025_native_mission_contact_association.sql` — garde transactionnel et compatibilité EXECUTE.
3. `src/app/api/native/runtime/route.ts` — distinction sélection active / association métier explicite.
4. `src/lib/native/mission-contact.ts` — rattachement réutilisant le contexte et le Journal existants.
5. `src/lib/native/scoped-context.ts` — version de capacité et preuve interne au commit.
6. `src/components/native/NativeScopeSelector.tsx` — confirmation et instruction de nouveau fil.
7–11. `src/i18n/messages/{fr,en,es,de,it}/consolidated-ui.json` — deux messages pour les cinq langues.
12. `src/tests/helpers/native-runtime-browser-fixture.mts` — migration 025 en base jetable.
13. `src/tests/native-documents-postgres.test.ts` — EXECUTE de la dépendance SQL, assertions conservées.
14. `src/tests/native-runtime-browser.e2e.mjs` — contexte langue/page dans l’assertion HTTP, sans retrait de contrôle.
15. `src/tests/native-mission-contact-postgres.test.ts` — concurrence, révocation, accès, idempotence, migration et grants.
16. `src/tests/native-mission-contact-browser.e2e.mjs` — les deux parcours et perte d’acquittement.
17. `src/tests/native-mission-contact-restart-browser.e2e.mjs` — reprise après redémarrage.
18. Ce rapport.

## Conditions et retour arrière

GO pour une nouvelle recette **strictement isolée** du correctif P1. Le rattachement d’un contact à une conversation historique n’est volontairement pas activé : un nouveau fil est nécessaire pour ce nouveau contexte. Les deux 503 intermittents sont une limite de stabilité à surveiller, non une validation de disponibilité Production.

Avant une future installation autorisée : sauvegarde/restauration et cible attestées, migration 025 en rôle de migration prévu, vérification des EXECUTE et du protocole 1, remplacement des processus applicatifs, puis recette des deux parcours. Aucun droit SQL de création à ajouter au rôle runtime. Aucune activation fournisseur implicite.

Retour arrière applicatif non destructif vers la référence précédente : conserver les missions, contacts, sessions, fonctions et événements persistés. Ne pas supprimer les associations, les historiques ou les reçus. Le code précédent ne fournit plus le nouveau rattachement, mais ne doit pas effacer les données créées. Toute opération distante ou promotion exige une autorisation distincte.

**Production reste NO-GO. Aucun push, merge ou déploiement autorisé par ce rapport.**
