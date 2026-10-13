# Production V2 — correctif P0 du Brain OS

Branche indépendante `fix/os-production-v2-p0-20261013`, base
`consolidation/clara-os-clean-base` (`c49d940`). PR #173 conservée en Draft,
sans modification de sa branche `fix/os-i18n-consolidation-20261013`
(tête auditée `4171e33`). Aucun changement Clara Live, Unified Core, identifiants,
secrets, configuration Vercel ou migration nouvelle. Aucun merge/déploiement.

## Audit et corrections

### A — Contexte transmis

Le handler conservait le contexte Live dans le payload, mais le raisonnement
n'en extrayait pas les faits. Une source Brain `clara-live-project` transporte
maintenant les données effectivement fournies : projet, préparation active,
items et leurs statuts, contenu de la feuille Production, documents et extraits
associés, préparations et calculs datés disponibles. La même source nourrit le
raisonnement et la composition ; elle reste une donnée, pas une instruction.

Les identifiants de projet doivent être cohérents. Les documents explicitement
étrangers sont exclus ; les pièces supplémentaires nécessitent une association
explicite ou un ID présent dans la liste documentaire du contexte projet.
Aucune association n'est déduite d'un nom, titre, email ou recherche Drive.
Le produit est authentifié par le mécanisme existant ; les lectures owner-scoped
Live existantes de #301 fournissent ce contexte. Aucun nouveau mécanisme
d'identité ou accès indépendant n'est inventé.

Limites : 32 000 caractères JSON de données, 3 000 caractères par chaîne,
100 éléments par tableau, profondeur 9, 20 documents par liste. Les omissions
sont explicites (`truncated` / `context_budget`) ; absence dans ce contexte ne
signifie jamais inexistence dans Live. Aucun inventaire métier P1 n'est ajouté.

### B — Historique et isolation

L'orchestrateur transmet exclusivement la conversation de la session hydratée
au raisonnement, en remplaçant un éventuel historique fourni par l'appelant.
Fenêtre chronologique de 24 messages / 24 000 caractères, déduplication par ID.
Les clés durables existantes sont conservées pour les sessions Live dont
workspace=projet ; un ID de projet distinct est ajouté à la clé hachée lorsque
plusieurs projets partagent un workspace/session. La mémoire d'événements
filtre produit/workspace/user/session/projet et workspace OS authentifié. Elle
ne réinjecte plus les payloads documentaires bruts des anciens événements.

Les sessions externes n'héritent plus de la mission globale ni du prénom du
propriétaire OS. Une demande Production `adviceOnly` n'exécute aucune tâche
mission/capability autonome. Les sessions et jobs utilisent leurs tables
existantes ; la sérialisation asynchrone reste celle des jobs durables #301.
Aucune nouvelle base de conversation.

### C — Génération complète ou interrompue

Le fournisseur expose déjà `responseStatus`, `incompleteReason` et les catégories
d'erreur. Le compositeur les contrôle explicitement : completed, incomplete,
failed, timeout, contenu vide. Un statut inconnu ne vaut pas completed.

Profil conversation borné à 3 200 tokens de sortie, au lieu du budget 1 200
inadapté aux réponses métier riches et au budget de raisonnement du fournisseur.
Timeout 60 secondes, sans retry SDK automatique ni continuation implicite.
Ce profil n'augmente pas les plafonds des autres usages : 2 000 hors profil,
6 000 pour l'analyse documentaire. Le statut réel est contrôlé même avec ce
budget ; augmenter les tokens ne constitue pas la correction à lui seul.

Le texte récupérable est conservé avec son statut et une indication d'interruption
localisée. Les marqueurs/propositions machine partiels ne peuvent produire une
action. Dans un job durable, l'échec et la session partielle sont persistés dans
une seule instruction SQL avec le contrôle d'ownership existant. Le job demeure
`failed`, `result=null`, code existant `CORE_EVENT_PROCESSING_FAILED`, catégorie
existante `output_truncated` (ou la catégorie fournisseur appropriée). Il n'est
ni completed ni automatiquement rejoué. Un propriétaire déjà completed ne peut
être rétrogradé par une écriture tardive.

**Limite produit explicite :** Live #301 affiche l'échec du job et ne récupère pas
le fragment conservé dans OS. Exposer ce fragment dans Live nécessiterait une
intervention ultérieure distincte. Le protocole des jobs Live reste inchangé.

### D — Sources Drive

La source Drive générique et son builder refusent toute recherche globale dans
un contexte projet ou un appel Live. Les documents explicitement associés déjà
transmis sont la source documentaire. Sans extrait pertinent transmis, aucune
recherche globale automatique ni réanalyse/réimport n'est lancée. Les usages
Drive natifs hors contexte projet conservent le comportement existant.

## Compatibilité #173 et ordre recommandé

Chevauchements : `response-composer.ts` et `/api/clara/chat/route.ts`. Le P0 reprend
strictement le helper `response-language.ts`, la signature optionnelle `locale`
et l'instruction de langue de #173 afin que les notices d'interruption et les
réponses restent compatibles FR/EN/ES/DE/IT. Aucun dictionnaire, écran téléphonie
ou workflow i18n de #173 n'est modifié. Les citations originales restent intactes.

Ordre proposé après autorisation : #173 puis la PR P0. Vérifier l'arbre combiné,
les cinq langues, les tests et le build sur les têtes réellement retenues avant
tout merge. Une simulation d'arbre n'est pas un merge de branches.

## Validation synthétique reproductible

- `node --import tsx --test src/tests/production-p0.test.ts` : contexte réel du
  raisonnement, provenance/limites, historique, isolation mémoire, refus Drive,
  usages Drive hors projet, génération interrompue et cinq langues, budgets.
- PostgreSQL 17 isolé, table de sessions historique et migration **existante**
  007 seulement dans le fixture : définir `DOCUMENT_OPERATION_TEST_CONTAINER`
  sur `clara-document-registry-test-p0`, puis exécuter
  `production-p0-postgres.test.ts` et `event-jobs-postgres.test.ts`.
- La commande complète du workflow GitHub `Production P0 validation` couvre
  également les contrats externes et les échecs d'analyse documentaire.
- `npx tsc --noEmit`, ESLint ciblé, build Next.js. En cloud local, le build utilise
  Webpack et le cache de fontes Google déjà préparé ; CI construit normalement.
- Compatibilité contrôlée avec le client/DTO Live #301 (`f689caf`) inchangés,
  sur des résultats réellement persistés par le worker OS isolé (completed et
  failed/output_truncated). Aucun service ou projet réel n'est utilisé.

## Recette ORIGINS après déploiement séparément autorisé

1. Capturer en lecture les états projet `prj_2a44fbda8a474363`, préparation
   `prep_fa0c021cd9ea4c41`, documents et feuille Production. Aucun changement
   de données métier pour préparer cette recette.
2. Avec l'utilisateur propriétaire authentifié, ouvrir Production et demander
   un conseil `adviceOnly` sur le planning et les points à vérifier, sans
   importer/réanalyser de document ni demander une écriture.
3. Comparer les faits réellement transmis et leur provenance à la réponse :
   confirmed/to_verify/missing préservés, informations connues réutilisées,
   limites du contexte explicites, aucun document Drive étranger.
4. Poser une question de suivi dans le même fil, naviguer puis reprendre.
   Vérifier continuité et ordre des échanges. Ouvrir un autre projet/fil autorisé
   et vérifier l'absence d'informations ORIGINS dans celui-ci.
5. Après intégration autorisée de #173, vérifier FR/EN/ES/DE/IT et conservation
   des citations dans leur langue d'origine.
6. Vérifier l'état fournisseur réel et le reçu durable. En cas d'interruption
   naturelle : job failed, catégorie explicite, texte partiel persisté dans OS,
   aucune réponse affichée comme complète. Ne pas provoquer un timeout/token
   limit en production ; ces scénarios sont couverts par les mocks isolés.
7. Comparer les états métier avant/après : aucune écriture autonome, données
   techniques et documents identiques. Ne pas annoncer cette recette validée
   tant qu'elle n'a pas été exécutée après autorisation.

Risques résiduels : résultat fournisseur réel et recette ORIGINS non testés ;
contenus volumineux bornés avec omission annoncée ; consultation d'un fragment
via Live non implémentée ; clients synchrones concurrents hors file durable
non soumis à la sérialisation #301. Aucun nouveau droit de consultation n'est
accordé et les jobs/documents de production n'ont pas été touchés.

## Résultats constatés

- 26 tests ciblés réussis, aucun ignoré (P0, persistance PostgreSQL, jobs,
  contrats externes, échecs documentaires et budget fournisseur).
- 29 tests documentaires OS réussis.
- 21 tests Live #301 réussis sur une copie isolée de `f689caf` ; deux états
  réels du worker OS acceptés par le client/DTO Live inchangé.
- Arbre combiné avec #173 : 13 tests réussis, TypeScript réussi. Aucun conflit
  restant après séparation des imports P0, sans modification de #173.
- TypeScript, ESLint ciblé et build local final réussis. Le workflow GitHub de
  pull request a aussi réussi installation, 26 tests, TypeScript et build.
- Le premier workflow push a échoué avant les tests : `pg_isready` sur socket
  Unix peut accepter le serveur temporaire d'initialisation PostgreSQL. Ce cas
  a été reproduit localement (Unix prêt / TCP non prêt). Le fixture vérifie
  maintenant TCP et échoue explicitement si le serveur final n'est pas prêt.

PR P0 : #174 (Draft). La liste suivante correspond à la différence avec la base
`consolidation/clara-os-clean-base` et ne contient aucun fichier Clara Live.

## Fichiers modifiés

- `.github/workflows/production-p0-validation.yml`
- `docs/production-v2-p0.md`
- `src/app/api/clara/chat/route.ts`
- `src/i18n/response-language.ts`
- `src/lib/brain/brain-source-registry.ts`
- `src/lib/brain/drive-context.ts`
- `src/lib/brain/live-project-context.ts`
- `src/lib/brain/memory.ts`
- `src/lib/brain/reasoning.ts`
- `src/lib/brain/response-composer.ts`
- `src/lib/brain/response-generation.ts`
- `src/lib/connectors/internal/openai/responses/openai-responses-context.ts`
- `src/lib/connectors/internal/openai/responses/openai-responses-engine.ts`
- `src/lib/core/clara.ts`
- `src/lib/core/conversation-context.ts`
- `src/lib/core/orchestrator.ts`
- `src/lib/core/session.ts`
- `src/lib/external-capabilities/event-job-worker.ts`
- `src/lib/external-capabilities/event-jobs.ts`
- `src/lib/external-capabilities/external-event-handler.ts`
- `src/tests/helpers/external-event-route-harness.ts`
- `src/tests/helpers/production-p0-harness.ts`
- `src/tests/production-p0-postgres.test.ts`
- `src/tests/production-p0.test.ts`
