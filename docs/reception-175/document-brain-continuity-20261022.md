# Consolidation Documents / Brain / Journal — réception isolée, 22 octobre 2026

**GO fonctionnel en isolation, avec fournisseurs simulés et réserve HTTP historique maintenue. Production : NO-GO.** Aucun GO fournisseur réel, aucun merge, push ou déploiement.

## Référence et conservation

Base vérifiée : **624fc09288dfab0509df083b0724c80bdab14124**, checkout `/workspace/clara-os-core-reception` initialement propre. Branche locale de correction : `fix/native-documents-brain-continuity-20261022`. La branche P1 `fix/native-mission-contact-p1-20261022` reste sur 624fc09 ; son commit est conservé comme ancêtre. Les **137 fichiers de preuves antérieures** recensés restent inchangés (`preservation-proof.json`). Les références documentaires existantes ont été lues, pas reconstruites. Les références #176/#199 ne sont ni modifiées ni fusionnées sur GitHub.

L’identifiant du commit local final et les empreintes des fichiers sont consignés après commit dans le dossier de preuves `/workspace/documents-brain-fix-20261022/`. Aucune publication GitHub autorisée ou réalisée.

## Correctifs appliqués et mécanismes réutilisés

### 1. Documents → conversations / Brain

- Réutilisation du **contrat déjà existant `clara.document-analysis.v1`** et de son analyseur : entités, faits, locators, confiance, ambiguïtés et conflits. L’analyseur est exporté pour l’appel natif ; aucun ticket ni identité Live ne sert d’autorisation. Le discriminant interne existant est celui du helper cognitif, sans dispatch d’événement Live ni accès interproduit.
- `DOCUMENT_RECEIVED` possède désormais une entrée dans le raisonnement du Brain existant. La proposition structurée et les extraits autorisés sont passés au cycle Core/Brain et au compositeur, sans remplacer la mission commerciale par une nouvelle mission documentaire.
- Conservation des extraits et résultats dans **l’analyse chiffrée des références Mission/Session existantes**, pas dans un nouveau store. Chaque fait retenu doit viser un locator créé côté serveur et une valeur présente dans le segment cité ; les locators étrangers sont écartés. Les hypothèses/ambiguïtés reconnues dans la ligne source restent annotées. Toutes les propositions sont explicitement **non certifiées**, y compris lorsqu’une source affirme une confirmation.
- Au chat ordinaire, `BrainSourceContext` recharge les références de la mission active et de la connexion explicitement choisie, vérifie l’autorité canonique, le principal Google, les permissions et les versions, puis expose un contexte documentaire borné. Pas de repli vers un compte, un projet ou une mémoire globale. Les références d’autres connexions sont conservées ; elles ne sont pas sélectionnées implicitement.
- Les analyses multi-sources conservent les dépendances document/version. Une analyse qui dépend d’une source désormais refusée est masquée plutôt que rendue comme preuve fraîche. Les anciennes versions restent dans l’historique des références ; le contexte actif utilise la dernière analyse de chaque fichier, soumise aux droits courants. Une ancienne analyse sans données structurées ne devient pas une extraction certifiée par défaut.
- Les gardes de système pour les sources documentaires interdisent de traiter leur contenu comme instructions ou permissions ; aucun outil n’est exposé au modèle. Le contenu source brut reste dans le contexte éphémère et les références/reçus chiffrés ; `session.sources` et les sources du dashboard ne conservent pas une copie en clair réutilisable sans vérification.
- **Défaut supplémentaire reproduit dans le navigateur :** le recalcul de la mission perdait `documentReferences`. `nativeMission` conserve désormais celles de la mission canonique existante lorsqu’une replanification ne demande aucun détachement. Les protections contact/mission de 624fc09 restent inchangées.

Les réponses conversationnelles et événements déjà persistés restent l’historique natif de leur propriétaire. La révocation n’est pas une réécriture de cet historique ; elle interdit une nouvelle exploitation documentaire et le rejeu de reçus documentaires/chat sans revalidation. Aucun contenu historique n’est réaffecté à une autre mission.

### 2. Journal et reçu documentaire

- `operationId` explicite sur POST `/api/documents` action `read`, même format que les opérations natives existantes. Une même identité et un même contenu rejouent le reçu ; contenu ou contexte différents avec la même identité : refus 409. Une nouvelle identité explicite représente une nouvelle consultation et peut être journalisée.
- Réutilisation de **`clara_external_event_jobs`**, avec un type `native-document` séparé des jobs inbound et chat. Aucun nouveau registre ni table.
- La réservation précède extraction et cognition. Le reçu chiffré, les modifications Mission/Session et `DOCUMENT_RECEIVED` sont finalisés dans **une transaction PostgreSQL**, avec CAS et preuves documentaires recontrôlées. La révocation OS et le commit passent par le même ordre de verrous canoniques ; ce n’est pas une simple deuxième lecture présentée comme atomique.
- Un échec vérifié produit un reçu d’échec sans faux succès ni Journal de lecture réussie. Un résultat de persistance inconnu conserve le propriétaire : ni reprise automatique, ni vol de lease, ni seconde invocation implicite.
- Les deux clients Documents existants réutilisent le même helper navigateur. L’identité d’une soumission non acquittée reste en `sessionStorage` pendant le refresh ; seul un clic explicite rejoue le POST. Après succès acquitté, un nouveau clic peut créer une nouvelle consultation. Le reçu persiste côté PostgreSQL à travers un redémarrage applicatif.
- Le rejeu d’un reçu chat à contenu documentaire vérifie lui aussi les droits courants. Les anciennes routes, reçus chat et événements externes restent séparés et conservés.

### 3. Restitution

Le panneau documentaire existant, déjà monté dans Documents, Clara, Brain et Cockpit, affiche les faits et locators, ambiguïtés et conflits, avec un avertissement « assertions non certifiées ». Les quatre libellés sont traduits FR/EN/ES/DE/IT. Les données et documents d’origine ne sont pas traduits.

## Migration additive 026 et droits

`026_native_document_continuity.sql`, à appliquer **après les dépendances natives existantes et 025** :

- étend la contrainte de type de l’ancien ledger ; aucune nouvelle table, aucun backfill ni suppression ;
- ajoute `clara_native_document_command` et un wrapper du commit natif pour valider toutes les preuves documentaires dans la transaction ;
- conserve les noms des paramètres du contrat SQL antérieur, nécessaires à la réapplication des migrations ;
- marque le protocole documentaire : si 026 manque, `NativeDocuments` refuse avant le transport ; aucune initialisation DDL au démarrage n’est ajoutée ;
- fonctions **SECURITY INVOKER**, EXECUTE retiré à PUBLIC ; reprise de l’ACL explicite du runtime et accès à la commande documentaire limité aux rôles disposant déjà du runtime et de l’autorité Google.

Le rôle applicatif doit conserver ses droits natifs existants et SELECT/INSERT/UPDATE sur le ledger de jobs déjà utilisé par le chat, plus EXECUTE sur les wrappers natifs/Google et la nouvelle commande. Aucun privilège administrateur, CREATE de schéma ni droit DDL applicatif n’est ajouté. Aucun GRANT distant exécuté. Application et réapplication testées localement avec conservation des reçus/historiques ; les tests PostgreSQL de restauration existants passent. Cela ne certifie pas une restauration Production.

Retour arrière non destructif : conserver le commit 624fc09 et revenir au code approuvé si nécessaire, **sans supprimer les reçus, références, jobs ni événements**. Ne pas remettre une ancienne contrainte de type tant que des jobs `native-document` existent. Une réapplication d’anciennes définitions doit toujours être suivie de 026 ; le marqueur de protocole ferme le chemin documentaire si le wrapper attendu est absent. Aucun rollback ni migration Production effectué.

## Réception exécutée

Environnement : Next `start` sur build réel, Chromium HTTPS local, PostgreSQL jetable, transports Google et OpenAI simulés. PDF synthétiques avec lumière/son/vidéo, alimentation, scène, logistique, hypothèse et patch manquant ; sources contradictoires **32 A triphasé / 16 A monophasé** et **10 m / 8 m de scène**. Deux missions distinctes, contrôle interprojet et autre propriétaire. Parcours mêlant interactions navigateur et requêtes HTTP réelles, pas une certification entièrement « clic par clic » de chaque mutation.

| Validation | Résultat | Preuve |
|---|---|---|
| Tests ciblés et non-régression | **67 PASS, 0 FAIL, 0 skip** | `regression-complete.log` |
| Navigateur principal | **PASS** : rattachement, deux sources, chat contextualisé, langues, Journal, isolation et révocation des reçus | `browser.log`, `browser-result.json` |
| Redémarrage serveur + nouveau navigateur | **PASS** : même mission/conversation/références et reçu ; nouveau fil explicitement sélectionné ; sept surfaces | `restart.log`, `restart-result.json` |
| Acquittement réellement coupé après commit depuis UI | **PASS** : refresh et clic explicite, un seul événement, aucune seconde analyse | `ack-loss.log`, `ack-loss-result.json` |
| TypeScript | **PASS** | `tsc-verified.log` |
| Build Next | **PASS** | `build-complete.log` |
| Lint des fichiers modifiés | **PASS** | `lint-verified.log` |
| Lint global | **FAIL préexistant : 9 erreurs / 9 avertissements** | `lint-final.json`, fichiers identiques à 624fc09 dans `lint-baseline-comparison.json` |
| Qualité réelle du modèle, fournisseurs et matériel | **NON TESTÉ / NON CERTIFIÉ** | fournisseurs interdits dans ce lot |

Les 67 comprennent les 50 tests documentaires/natifs/contrats antérieurs, sept tests i18n et dix contrôles (parent inclus) du nouveau test PostgreSQL. Ils ne sont pas 67 parcours navigateur. Les trois scénarios navigateur sont séparés. Aucun test défaillant désactivé ; aucun fournisseur réel appelé.

### Preuves de persistance et d’autorité

- `final-persisted-runtime.json` : mission, sessions et références durables ; même historique après reprise, pas de transfert vers le nouveau fil.
- `final-journal-scopes.json` : événements effectivement stockés et scopes utilisateur/workspace/client/projet/session.
- `final-receipt-proof.json` : **trois opérations documentaires terminées avec résultats chiffrés**, deux opérations chat ; les rejouements n’ajoutent pas de lecture.
- `provider-proof.json` : les deux sources sont présentes dans les prompts Brain et compositeur ; absence d’outils, garde de contenu non fiable.
- `structured-analysis.json` : faits, hypothèse, conflit, versions et locators. Les mocks démontrent le passage et le contrôle des données, **pas la justesse sémantique d’un fournisseur réel**. Les ambiguïtés/conflits libres restent liés au lot de sources ; leur attribution sémantique fine n’est pas certifiée par la présence d’un locator de fait.
- `matrix.csv` : 24 raccordements PASS / FAIL / NON TESTÉ, avec limites par élément.

## Échecs rencontrés et conservés

- Premiers essais : traitement d’échec connu laissant une réservation indéterminée, puis incompatibilité de noms de paramètres SQL lors des réapplications. Corrigés par reçu terminal sans nouveau Journal et conservation des noms antérieurs ; les tests finaux passent. Le contrôle lancé une fois sans variable de conteneur a été ignoré et **n’est pas utilisé comme validation**.
- Premier navigateur : perte réelle des références lors de la replanification, corrigée et couverte par le nouveau test et les reprises réussies.
- Exécution suivante : timeout de six minutes, conservé dans `timeout-browser.log`. Dernière exécution avec budget explicite et préchargements spéculatifs filtrés **uniquement dans le nouveau harnais navigateur** ; les navigations métier, APIs, permissions et assertions restent exercées. Aucun retry automatique. Le harnais HTTP→Docker ne mesure pas la performance de Production.
- Réserve HTTP 503 historique maintenue. Les derniers proxys locaux sont sans pooling ni retry ; aucune erreur socket n’a été observée sur ces deux exécutions finales. Les 503 `/api/calendar` et 502 météo observés sont les capacités sans prérequis fournisseur de la fixture, pas un PASS de ces services. Aucune conclusion rétroactive sur l’ancien 503 `/clara`.

## Limites et décision

**GO pour le parcours fonctionnel reçu en isolation** : Mission ↔ Documents ↔ Brain ↔ conversations ↔ Journal ↔ Cockpit, avec références autorisées, reçus durables et fournisseurs simulés.

Restent hors certification : qualité sémantique réelle (dont injection, classification et contradictions), droits Google réels, atomicité avec une révocation distante Google, configuration Production, disponibilité HTTP Production, matériel/voix/téléphonie/IONOS/Live réels. Les droits Google sont revérifiés avant persistance ; cela n’est pas une transaction distribuée avec Google. Une invocation interrompue avant reçu confirmé reste bloquée et exige une réconciliation opérateur, jamais une relance automatique.

Compatibilité : les deux interfaces ont été adaptées ; un ancien client POST documentaire sans `operationId` reçoit 400 `NATIVE_DOCUMENT_OPERATION_REQUIRED`. Aucun repli silencieux sans identité d’opération. Les conversations historiques restent des archives natives ; pas de suppression ou traduction de leurs contenus. Les liens profonds de navigation du Journal n’ont pas été développés dans ce lot.

**Production : NO-GO.** Aucune publication, PR, merge, migration distante, opération fournisseur ni déploiement. Aucun changement IONOS V1, Clara Live, Twilio ou ElevenLabs. Les bases jetables sont supprimées après capture, le conteneur remis à l’arrêt ; le checkout, les branches et les preuves sont conservés.

## Fichiers du correctif

- `db/migrations/026_native_document_continuity.sql`
- `src/app/api/clara/chat/route.ts`
- `src/app/api/documents/route.ts`
- `src/app/documents/page.tsx`
- `src/components/native/NativeDocumentsPanel.tsx`
- `src/i18n/messages/de/consolidated-ui.json`
- `src/i18n/messages/en/consolidated-ui.json`
- `src/i18n/messages/es/consolidated-ui.json`
- `src/i18n/messages/fr/consolidated-ui.json`
- `src/i18n/messages/it/consolidated-ui.json`
- `src/lib/brain/brain-source-registry.ts`
- `src/lib/brain/reasoning.ts`
- `src/lib/brain/response-composer.ts`
- `src/lib/documents/native-read-request.ts`
- `src/lib/external-capabilities/external-event-handler.ts`
- `src/lib/native/chat.ts`
- `src/lib/native/document-operation.ts`
- `src/lib/native/documents.ts`
- `src/lib/native/scoped-context.ts`
- `src/tests/helpers/native-document-cognition-fixture.mjs`
- `src/tests/helpers/native-runtime-browser-fixture.mts`
- `src/tests/helpers/native-runtime-browser-preload.mjs`
- `src/tests/native-document-ack-browser.e2e.mjs`
- `src/tests/native-document-continuity-browser.e2e.mjs`
- `src/tests/native-document-continuity-postgres.test.ts`
- `src/tests/native-document-continuity-restart-browser.e2e.mjs`
- `src/tests/native-documents-browser.e2e.mjs`
- `src/tests/native-documents-postgres.test.ts`

Rapport et matrice versionnés ajoutés : `docs/reception-175/document-brain-continuity-20261022.md` et `docs/reception-175/document-brain-continuity-20261022.csv`.
