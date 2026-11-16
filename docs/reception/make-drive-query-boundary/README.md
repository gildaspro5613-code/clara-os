# Make Drive — contrat cognitif et preuve isolée

Base : `6a169c32c5534f75761d8f7ce88c83db478e81c4`, tête de
`delivery/clara-os-v1-20261025` au démarrage. Aucun changement du validateur,
du scénario Make, des connexions, des grants natifs, de Neon ou de Clara Live.

## Cause démontrée et limite de l'incident

Le sélecteur cognitif `native-connector-builder-selection.ts` transmet uniquement
les IDs des capacités autorisées à OpenAI. Il ne transmet ni la description ni
`MakeDriveFindCapabilityDefinition.inputSchema`. Son outil strict valide seulement
`{capabilityId, inputJson: string}` : le JSON contenu dans cette chaîne est opaque.
Le modèle doit donc deviner les noms des arguments Make. Le contrat existant
requiert pourtant exactement `query` et, facultativement, `folderId`.

C'est un défaut de transmission du contrat démontré dans le code. Ce n'est pas
une preuve de la cause exacte de l'appel historique. Les arguments réellement
générés ne sont pas disponibles dans les éléments consultés ; l'audit natif
n'enregistre volontairement ni arguments ni réponses fournisseur. Il faudrait
la chaîne `inputJson` (ou `toolCall.arguments`) de cet appel, expurgée de toute
identité et de tout secret, et le chemin d'entrée utilisé pour trancher.
Aucune nouvelle journalisation d'arguments n'est ajoutée.

Le motif `CONNECTOR_BUILDER_MAKE_QUERY_DENIED` regroupe tous les rejets de
`nativeMakeDriveReadPayload`, y compris workspace canonique invalide, objet ou
clés invalides, query invalide et folderId invalide. Il ne prouve pas un problème
`folderId`. À cette base, folderId absent, null ou vide est déjà accepté.
`{query:"RTSE Angers"}` est déjà accepté avant ce correctif.

## Parcours et correctif

1. `eligibleConnectorReadNames` intersecte la demande explicite avec les capacités
   natives découvertes. Aucun grant n'est créé par le modèle.
2. Le sélecteur produit `clara_connector_read` avec `capabilityId` et `inputJson`.
   Le correctif ajoute, uniquement si `make.drive.find` est éligible, la description
   et l'inputSchema existants ainsi que deux exemples de recherche. Pas de conversion
   implicite de `q`, `name`, `payload`, ni de fallback permissif.
3. `selectAndExecuteNativeBuilderRead` vérifie l'enveloppe et transmet `inputJson`
   inchangé à `executeNativeBuilderToolCall`, qui parse le JSON.
4. L'autre entrée, `CapabilityToolBridge`, route directement les tool calls de
   capacités natives au même outil. Elle ne passe pas par le sélecteur corrigé.
5. Le gateway vérifie objet borné, clés interdites, contexte signé et grant natif,
   puis écrit REQUESTED avant l'exécuteur.
6. L'exécuteur revérifie l'autorité et appelle le validateur Make avec le workspace
   canonique et l'input inchangé. Tout rejet devient le motif QUERY_DENIED.
7. Après validation seulement : vérification du blueprint approuvé, scénario fixe
   `find-drive-document`, adaptateur existant, reçu, puis revalidation du grant.

Ces barrières sont conservées. Les arguments n'accordent jamais une permission.
La boucle existante reste limitée à un READ par sélection : les deux recherches
sont deux appels successifs, sans nouvelle boucle autonome ni mémoire ajoutée.

## Preuve sans fournisseur

`src/tests/make-native-selector-contract.test.ts` utilise des sorties cognitives
**synthétiques**. Il traverse la sélection, la sérialisation JSON, le gateway réel
et le validateur Make réel, avec autorité/audit en mémoire et fournisseur simulé.
Il n'exécute ni le runtime SQL/credentials ni la vérification distante du blueprint.

- `{q:"RTSE Angers"}`, `{name:"RTSE Angers"}`, `{payload:{query:"RTSE Angers"}}`
  et un scenarioKey supplémentaire reproduisent REQUESTED → FAILED et le motif
  exact QUERY_DENIED, sans atteindre le fournisseur simulé. Ce sont des cas de
  reproduction possibles, pas les arguments historiques présumés.
- `{query:"RTSE Angers"}` produit le payload avec le workspace canonique, puis
  le fileId du dossier synthétique est réutilisé comme folderId pour
  `D-Cables et Coffrets 2.pdf`. Les deux appels terminent SUCCEEDED.
- `06 - D Électricité et câblage`, accents et folderId absent/null/vide passent.
- query manquante, invalide, vide, trop longue, contrôles, mauvais folderId,
  clés d'autorité, token et pollution de prototype sont refusés.
- Grants absents et inter-utilisateurs/workspaces/clients/projets sont refusés.
  Les tests existants couvrent aussi révocation/révision, session absente,
  échec d'audit et reçus incorrects.

La correction de prompt est testée en vérifiant que le contrat existant est
transmis seulement pour la capacité éligible. Aucune génération OpenAI réelle
n'est effectuée : la qualité effective de sélection du modèle n'est pas certifiée.

Commande ciblée :

```sh
node --import tsx --test \
  src/tests/make-native-selector-contract.test.ts \
  src/tests/make-native-drive-input.test.ts \
  src/tests/connector-builder-native-selection.test.ts \
  src/tests/connector-builder-native-gateway.test.ts \
  src/tests/make-native-read-handoff.test.ts \
  src/tests/make-connector.test.ts \
  src/tests/make-on-demand-contract.test.ts
```

Résultat : **51 tests, 51 pass, 0 fail, 0 skipped**. Exécution locale avec un
preload bloquant fetch, net.connect/createConnection, tls.connect et les requêtes
http/https. Les transports simulés explicitement injectés restent utilisables.
Aucun appel fournisseur/SQL réel. Aucun secret affiché.

Limite environnement : `npm ci --ignore-scripts` échoue avant les tests sur une
incohérence préexistante du lockfile (`@emnapi/*`, `@napi-rs/wasm-runtime`) avec
npm 11.9.0/Node 24.19.0. La tentative `--legacy-peer-deps` rencontre des téléchargements
403 du registre et est arrêtée. Tests exécutés avec les dépendances déjà installées
dans le checkout voisin, liées localement (aucun fichier de dépendances modifié).
Il ne s'agit donc pas d'une preuve d'installation propre reproductible.

Vérifications supplémentaires : TypeScript (`node node_modules/typescript/bin/tsc --noEmit --pretty false`) et ESLint ciblé sur les deux fichiers TypeScript modifiés passent sans diagnostic. `git diff --check` passe.

Aucun build Next, test navigateur, stockage PostgreSQL ou test transverse lancé :
changement de prompt seulement, sans modification métier persistée ni UI.
Aucune certification Production. La branche de travail est explicitement exclue
des déploiements Git Vercel dans `vercel.json`. Livraison en PR Draft uniquement ;
aucune fusion, passage Ready ou opération de déploiement.
