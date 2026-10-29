# PR #219 — préparation du workflow de réception, 28 octobre 2026

## Résultat

**NO-GO déploiement dans le contexte actuel : bindings effectifs NON ATTESTÉS.** Aucune URL nouvelle, aucun upload, aucun POST Vercel, aucune migration ni activation fournisseur. Ce résultat ne signifie pas que les protections ou ressources distantes sont absentes.

La branche distante a été récupérée et vérifiée à `e1d89bba1cbef31c3d93ca6a3298bbe87c5c05e8`, parent `652a332852a0302de3d79d95347447dcc21074bf`, arbre `e3fd0ebe186b4a5a93121a6ee653bd354549aef5`. La PR #219 et ses quatre contrôles verts sont déclarés par le propriétaire; leur état n'a pas été réinspecté via l'API GitHub dans ce contexte.

## Adaptation ciblée

Le workflow existant `clara-os-independent-recette.yml` épingle désormais ce SHA applicatif. Le checkout vérifie dépôt, SHA, parent et arbre exact. Le contrôleur REST conserve les mêmes identités équipe/projet/custom Environment et le seul secret `VERCEL_RECETTE_TOKEN` dans l'Environment GitHub `clara-os-recette`. Il refuse toujours un projet relié à Git et conserve les refus 401/403 et l'absence de retry des écritures incertaines.

La copie destinée aux uploads retire uniquement `crons` de `vercel.json`, après vérification des deux déclarations exactes du SHA approuvé. Tous les chemins source sont conservés et tous les autres fichiers sont identiques octet pour octet. Les autres propriétés JSON sont identiques; seule la sérialisation de ce fichier peut différer. Le `vercel.json` suivi et ses crons Production restent inchangés. Le test compare réellement tous les fichiers au commit approuvé.

**Les trois verrous sont maintenus :** refus de `verify_only=false`, étape de déploiement `if: false`, contrôleur `writesAuthorized:false`. Une demande de déploiement ne produit donc pas d'upload. `verify_only=true` reste le défaut. La réussite des lectures de métadonnées projet/environnement est désormais explicitement distinguée d'une attestation du binding PostgreSQL.

Le workflow CI de sécurité existant prend en charge les chemins concernés et exécute les tests du transport hors ligne. Aucun nouveau workflow ou changement applicatif.

## Vérifications exécutées

- `node --test .github/scripts/recette-deployment-api.test.mjs` : 24 PASS, zéro échec/ignoré, transports simulés; vérification des fichiers Git réels.
- `node --import tsx --test src/tests/recette-runtime-attestation.test.ts src/tests/recette-external-execution-guard.test.ts src/tests/recette-network-provider-denials.test.ts` : 26 PASS, zéro échec/ignoré. Métadonnées et SQL simulés, aucune attestation fournisseur.
- Script existant `node --import tsx src/scripts/attest-recette-runtime.mts --source-sha=e1d89bba1cbef31c3d93ca6a3298bbe87c5c05e8` dans le contexte disponible : `{"status":"NON ATTESTÉ","checks":[],"writesRequested":false}`; code de sortie 1 attendu, aucun binding utilisable ni lecture SQL engagée.
- `git diff --check` : PASS. Aucun changement sous `src`, `db`, `public`, ni dépendances, ni `vercel.json`. Build/interface non rejoués : code applicatif inchangé.

## Obstacle précis et prochaine opération

Le runtime Cloud observé est connecté, mais sa politique réseau appliquée ne permet ni `api.github.com` ni `api.vercel.com` ni l'API Neon; il ne fournit aucune identité Vercel/Neon ou binding effectif. Le Git HTTPS fonctionne. Les secrets de l'Environment GitHub, même présents, ne sont pas des variables du runtime Cloud. Ne pas demander leur copie dans une conversation et ne pas modifier les credentials.

La levée du blocage exige **une attestation depuis un contexte autorisé ayant accès aux bindings effectifs du custom Environment existant**, et non une nouvelle infrastructure :

1. Projet `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`, équipe `team_0BeqOAO8t5oDEBdzHHdekcxv`, custom Environment `env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM`, slug `clara-os-recette`.
2. Réutiliser `validateRecetteDatabaseBinding` puis le contrôle opérateur `attest-recette-runtime.mts` dans un contexte de confiance disposant des valeurs effectives. Il vérifie branche `br-crimson-feather-b2zr00sf`, base `neondb`, rôle `clara_os_recette_limited`, absence de `POSTGRES_URL` et de privilèges administratifs, métadonnées Neon et source du déploiement. Le script attend un déploiement existant : pour une vérification antérieure à publication, utiliser le SHA réellement déployé, sans inventer de `VERCEL_DEPLOYMENT_ID` ou lui attribuer déjà le nouveau SHA. Une attestation de l'ancien déploiement ne prouve pas à elle seule les bindings de la prochaine création.
3. Vérifier aussi l'origine d'authentification et les retours autorisés vers la réception, l'absence d'alias Production, les protections d'accès, et les gardes fournisseurs inchangés. Aucun secret dans les preuves retournées.
4. Dans GitHub Actions, le workflow existant peut être lancé uniquement avec cette branche et `verify_only=true` depuis un accès autorisé. Il vérifie les métadonnées équipe/projet/environnement; **il ne récupère pas les variables Vercel effectives et ne certifie pas Neon**. Aucune exécution Actions n'a été lancée depuis ce runtime.
5. Après toutes ces preuves seulement, activer de façon revue l'opération exacte : uploads de l'artefact contrôlé puis une seule création `/v13/deployments`, vers le custom Environment indépendant. Le GO conditionnel du propriétaire n'est pas satisfait actuellement; aucune activation n'a été faite. Vérifier ensuite ID, URL, état READY, SHA `e1d89bb…`, custom Environment et bindings effectifs du nouveau déploiement avant réception.

## Capacités attendues, non reçues sur une nouvelle URL

La réception visuelle concerne les 13 pages restaurées, les GlassPanels, la navigation et FR/EN/ES/DE/IT. Les preuves navigateur antérieures sont conservées, mais aucune recette distante nouvelle n'est annoncée. Google/IONOS, génération réelle et voix restent soumis aux gardes et autorisations; aucune certification fournisseur n'est déduite des simulations.

## Complément — attestation du custom Environment avant publication

Le propriétaire a confirmé un précontrôle `verify_only=true` réussi après remplacement du jeton dédié. Cette preuve porte sur les métadonnées précédemment contrôlées; elle ne remplace pas la nouvelle attestation SQL.

Le workflow existant exécute maintenant `src/scripts/attest-recette-environment.mts` avant toute étape de déploiement. Le contrôleur est récupéré séparément depuis **le SHA du workflow exécuté** (`github.sha`), avec vérification Git; le checkout applicatif reste épinglé au SHA approuvé `e1d89bb…`. Les dépendances verrouillées sont installées avec `--ignore-scripts`. Aucun contrôle de provenance, d'autorité ou d'identité n'est retiré.

Le script réutilise `validateRecetteDatabaseBinding` et le contrôle SQL d'identité extrait sans changement de logique de `runtime-attestation.ts`. Ce dernier conserve sa vérification d'un déploiement existant : le nouveau contrôle prépublication ne lui attribue pas artificiellement un SHA ou un identifiant de déploiement.

Séquence exécutée par le nouveau contrôle :

1. Vérifier l'équipe, le projet indépendant et le custom Environment exacts par GET Vercel.
2. Lister les variables filtrées par cet Environment avec `decrypt=false`, puis obtenir par leur ID **seulement les quatre valeurs ciblées** via GET `/v1/projects/{project}/env/{id}`. Les réponses restent en mémoire : aucun fichier de valeurs, `GITHUB_ENV`, artefact ou journal de réponse. Les endpoints et paramètres sont confirmés dans le SDK officiel `@vercel/sdk` 1.28.53 (`projectsFilterProjectEnvs`, `projectsGetProjectEnv`), consulté séparément sans ajout de dépendance au dépôt.
3. Refuser `POSTGRES_URL`, les overrides des identités système et les bindings étrangers. Une valeur absente, non déchiffrable, héritée sans rattachement explicite au custom Environment, dupliquée ou une pagination non résolue produit `NON ATTESTÉ`; aucune priorité de variable n'est inventée.
4. Valider les valeurs avec le garde existant; vérifier l'endpoint réel auprès du projet Neon autorisé (normalisation explicite du hostname pooler, sans substitution de branche). **Aucune connexion SQL avant cette correspondance.**
5. Faire deux transactions Neon HTTP `readOnly:true`, contenant exclusivement des SELECT de métadonnées : base et rôle réels, absence de privilèges administratifs/CREATE public et base, absence d'appartenance à des rôles administratifs ou propriétaires des objets Clara; USAGE public, droits ciblés sur les tables et EXECUTE des fonctions natives non SECURITY DEFINER. Aucun GRANT, appel de fonction métier, lecture de contenu ou écriture. La liste des permissions contrôlées est explicite dans `environment-attestation.ts`, y compris Journal et audit. Elle concerne le socle de réception natif; elle ne donne aucune autorisation de provisionner les autorités mail, d'activer le monitoring, les mutations Stage ou les fournisseurs.
6. Émettre uniquement `PASS`, `FAIL` ou `NON ATTESTÉ` sur stdout, dans le résumé Actions et comme sortie d'étape `status`. Un statut autre que PASS fait échouer l'étape. Une erreur de transport/permission ou une valeur inaccessible ne passe jamais. Les erreurs brutes et les valeurs ne sont jamais affichées.

Les trois verrous d'écriture du workflow restent actifs. Aucune activation ou tentative de déploiement dans ce complément, même si les tests simulés retournent PASS.

### Validation du complément

- 34 contrôles ciblés d'attestation/environnement, attestation de déploiement existante et refus fournisseurs : PASS, zéro échec/ignoré, fournisseurs et SQL simulés.
- 24 contrôles du transport et de provenance : PASS, zéro échec/ignoré.
- TypeScript sans émission : PASS. ESLint ciblé : PASS. `git diff --check` : PASS.
- Exécution locale du nouveau script sans bindings sécurisés : `NON ATTESTÉ`, code 1 attendu; aucun accès distant tenté. Ce résultat ne qualifie pas les variables effectivement disponibles dans GitHub Actions.

### Exécution GitHub Actions encore nécessaire

Ce runtime ne peut pas déclencher ou consulter les Actions : `api.github.com` demeure exclu de la politique réseau appliquée et aucune identité API n'y est disponible. Le remplacement du secret Vercel dans GitHub ne modifie pas cette limite locale. Aucun essai de contournement, nouveau secret ou élargissement de jeton.

Depuis l'accès GitHub déjà autorisé, lancer **une fois, seulement en vérification** :

```sh
gh workflow run clara-os-independent-recette.yml \
  --repo gildaspro5613-code/clara-os \
  --ref fix/clara-os-historical-interface-20261028 \
  -f verify_only=true
```

Les seuls secrets attendus sont `VERCEL_RECETTE_TOKEN` et `NEON_API_KEY` dans l'Environment GitHub existant `clara-os-recette`, sans repli. Leur existence/portée n'est pas supposée : s'ils manquent ou si les lectures nécessaires sont interdites, le résultat reste NON ATTESTÉ, sans modification automatique de permissions. Ne pas copier de valeur dans une conversation ou un commentaire.

Après un PASS réel, préparer uniquement l'activation des trois verrous pour l'opération Preview déjà approuvée, en liant la condition d'écriture à `verify_only=false` **et** `steps.binding_attestation.outputs.status == 'PASS'`; conserver l'approbation d'Environment, la tentative unique, le projet/custom Environment exacts, l'absence de retry et les vérifications postpublication. Ce complément ne fait pas cette activation et n'effectue aucun déploiement. Le PASS attendu atteste la configuration courante, pas les bindings d'un déploiement futur : les contrôles après création restent indispensables, et toute modification de configuration entre les deux impose un nouveau précontrôle.

## 29 octobre — restriction `sensitive` et solution unique

Le dernier diagnostic distant (`abbd3ce…`, communiqué par le propriétaire) échoue avant toute connexion SQL : la réponse de lecture ne contient pas de valeur DATABASE_URL exploitable. Le défaut logiciel est notre hypothèse qu'une valeur `sensitive` serait nécessairement exportable par GET. La documentation générique du SDK intitulée « decrypted value » n'apporte pas cette garantie. La CLI officielle traite explicitement les secrets masqués : [classification sensitive](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/cli/src/util/env/env-var-config-secret-ui.ts#L96), [gestion des valeurs absentes lors du pull](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/cli/src/commands/env/pull.ts#L97), [message officiel « Secret values cannot be pulled »](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/cli/src/util/env/secret-read-guidance.ts). Ces sources ont été lues; le site documentaire Vercel et ses API restent inaccessibles depuis ce runtime. Les droits exacts du jeton ne sont donc pas réattestés ici. Aucun élargissement du jeton ni changement de visibilité de DATABASE_URL n'est proposé.

Le contrôle reconnaît désormais un binding `sensitive`/`visibility:secret` et n'essaie plus son extraction : NON ATTESTÉ, sans nouveau code de diagnostic ni tentative de déchiffrement supplémentaire. `env pull` n'est pas retenu comme solution de remplacement.

**Solution unique : contrôle bloquant dans le build Vercel, avant Next**, avec les variables que Vercel injecte réellement. Les composants préparés sont `build-attestation.ts` et `attest-recette-build.mts`. Ils réutilisent le garde de binding, le contrôle d'identité SQL et le SELECT des permissions déjà développés, sans copier les credentials. Deux transactions de métadonnées strictement READ ONLY; seul le statut sort. Une valeur déclarative « attestation PASS » ne permet aucun accès. Le script n'est ni une route HTTP ni un job planifié; il reste dormant et n'est pas raccordé au déploiement.

L'ordre de sécurité doit changer : l'injection effective a lieu **après création d'une tentative de déploiement**, pendant le build. Il est donc impossible de promettre une attestation SQL complète avant toute création avec cette méthode. Cette modification exige la décision précise suivante, avant tout POST :

> Autoriser une unique création de déploiement dans le projet indépendant et son custom Environment, après vérifications GET équipe/projet/environnement, rattachement explicite des quatre variables, absence de POSTGRES_URL, destinations/alias hors Production et métadonnées Neon de l'endpoint autorisé; attestation SQL obligatoire dans le build avant Next. Si elle ne passe pas, le build s'arrête, aucune publication READY n'est annoncée et aucun nouvel essai automatique n'est effectué.

L'artefact resterait fondé sur `e1d89bb…`, avec retrait des deux crons, et ajout/overlay strictement borné des quatre fichiers opérateur `src/lib/recette/build-attestation.ts`, `src/scripts/attest-recette-build.mts`, `src/lib/recette/environment-attestation.ts`, `src/lib/recette/runtime-attestation.ts` depuis le contrôleur revu, à consigner par SHA-256. Aucun fichier métier ni package ne serait changé. La commande de build serait explicitement `node --import tsx src/scripts/attest-recette-build.mts && npm run build`, via la configuration de cette seule création. L'approbation couvre donc aussi cette transformation supplémentaire; elle n'est pas présentée comme un artefact strictement identique au SHA applicatif. Les secrets de contrôle GitHub ne seraient pas injectés au runtime applicatif. Le contrôleur devrait ensuite vérifier READY, provenance, projet, custom Environment, URL et absence d'alias Production avant de remettre l'URL.

**Aucune activation, création, upload ou modification Vercel effectuée.** Les trois verrous REST sont conservés. Les tests isolés valident le composant; ils ne certifient pas un build Vercel réel. L'accès à `api.github.com` reste bloqué dans ce runtime : la publication Git est possible, le déclenchement Actions ne l'est pas. Décision actuelle : NO-GO Preview prête; attente de l'autorisation de cette unique tentative avec attestation au build, sans changement de secret, de fournisseur, de base ou d'infrastructure.

Validation de ce correctif : 19 tests ciblés PASS, zéro échec/ignoré (SQL et plans de contrôle simulés); TypeScript sans émission PASS; ESLint ciblé PASS; `git diff --check` PASS. Le paramètre de création `projectSettings.buildCommand` a été vérifié dans le modèle officiel `CreateDeploymentRequest` du SDK Vercel 1.28.53. Aucun résultat Vercel réel nouveau n'est annoncé.
