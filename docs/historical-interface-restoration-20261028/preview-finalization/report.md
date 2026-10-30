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

## 29 octobre — unique tentative autorisée par le propriétaire

L'autorisation de créer une tentative avant l'attestation SQL au build a été reçue. Le workflow existant est raccordé, sans déclenchement automatique : `verify_only=true` reste le défaut. Pour `false`, il exige les cinq contrôles CI terminés avec succès sur le SHA exact du contrôleur, la branche toujours à ce SHA, le projet/custom Environment exacts, les quatre rattachements sans lecture de valeurs, l'absence de fallback/override Production, les domaines hors Production et la correspondance Neon de l'endpoint attendu. Les permissions GitHub supplémentaires sont uniquement `checks:read` et `statuses:read` pour ce contrôle.

L'artefact est formé du SHA applicatif `e1d89bba1cbef31c3d93ca6a3298bbe87c5c05e8`, avec uniquement les quatre fichiers d'attestation figés à `18ea12305b28e7a617c96f34b2a937b4726af5a1`, la suppression des crons et la commande de build bloquante dans sa copie de `vercel.json`. **Pas de `projectSettings.buildCommand` dans la requête** : le SDK indique que les projectSettings peuvent être conservés pour les déploiements ultérieurs. Aucun paramètre permanent Vercel, fichier métier, secret ou dépendance n'est modifié.

Le contrôleur conserve le refus des reruns (`run_attempt != 1`), enregistre l'autorisation `pr219-20261029-one-build-attestation` dans les métadonnées de création et refuse une tentative déjà enregistrée. Une liste antérieure incomplète est refusée. Les uploads sont séquentiels; une seule création est possible dans l'exécution, sans retry des POST. Après READY, il revérifie projet, équipe, custom Environment, SHA applicatif, SHA d'attestation, empreinte de l'artefact et alias autorisés; il ne certifie rien si ces lectures échouent. Un résultat incertain n'autorise jamais un autre lancement.

Validation locale : 29 contrôles du transport/prérequis PASS; 19 contrôles des bindings/SQL PASS, tous avec transports et SQL simulés; TypeScript, lint TS ciblé et `git diff --check` PASS. Test réel du shell bloquant dans le contexte local sans variables Vercel : statut FAIL/code 1 attendu; la commande suivante n'est pas exécutée (marqueur absent). Ce n'est pas une attestation distante.

Le runtime Cloud reste sans accès à `api.github.com` et `api.vercel.com`, ni identité API configurée. Aucun workflow manuel, upload ou POST Vercel n'est exécuté ici; l'autorisation de création n'a donc pas été consommée. La CI distante du nouveau contrôleur n'est pas attestée localement. Depuis l'accès GitHub existant, après les cinq contrôles verts, l'unique opération autorisée est :

```sh
gh workflow run clara-os-independent-recette.yml \
  --repo gildaspro5613-code/clara-os \
  --ref fix/clara-os-historical-interface-20261028 \
  -f verify_only=false
```

Ne pas relancer après erreur, timeout ou résultat incertain. Conserver le run et son résumé : ID/URL/état/SHA si READY, sinon cause fixe sans secrets. Aucune URL Preview READY n'est annoncée dans cette mise à jour.

Le contrôle au build réutilise les trois étapes bornées DATABASE_BINDING / SQL_IDENTITY / SQL_PERMISSIONS en cas de refus, afin de qualifier un échec sans valeur sensible. Aucun nouveau mécanisme de diagnostic ni réessai.

## Finalisation Profil et authentification — source applicative c203cd7

Le propriétaire approuve `c203cd7229bc544e73b9537102dbf735476e166a` et atteste ses cinq CI vertes. Ce commit est bien le descendant direct de `9a64002…`; son seul fichier modifié est `NativeScopeSelector.tsx`. Une comparaison AST retirant uniquement les attributs className confirme que commandes, autorités et sélection restent identiques. Aucun nouveau changement graphique réalisé.

**Adresse stable retenue : `https://clara-os-recette.vercel.app`. Callback : `https://clara-os-recette.vercel.app/api/auth/google/callback`.** Ce sont les destinations déjà admises par le garde existant. Leur affectation réelle actuelle n'est pas attestée ici : l'API Vercel est inaccessible dans ce runtime. Le précontrôle préparé vérifie par GET `/v4/aliases/{alias}` que l'alias appartient au seul projet indépendant, n'est pas une redirection et désigne un déploiement READY de l'équipe et du custom Environment attendus. Aucun domaine Production ou DNS n'est modifié.

Les huit rattachements de variables sont vérifiés sans demander leurs valeurs : les quatre bindings PostgreSQL et `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CLARA_AUTH_APP_ORIGIN`, `CLARA_AUTH_GOOGLE_REDIRECT_URI`. Les deux dernières valeurs effectives sont comparées à l'adresse stable dans le build, en respectant la normalisation URL du contrat existant. Aucun secret Google n'est imprimé ou remplacé; aucune opération Workspace n'est ajoutée. La liste Google Console des callbacks n'est pas consultable ici : vérifier que l'URI Recette dédiée figure déjà sur le client existant; toute éventuelle addition exige autorisation, sans retirer/changer les URI Production ou celles du connecteur Workspace.

Le nouveau composant `oauth-reception-attestation.ts` effectue seulement un SELECT EXISTS en transaction READ ONLY, après le garde de base, pour vérifier une identité Google inscrite et une appartenance active, plus les permissions de création de transactions de connexion et sessions. Aucun INSERT, provisionnement, association par email ou GRANT. **Cela démontre une présence générique, pas que le compte Google personnel de l'opérateur correspond à cette identité.** La correspondance exacte reste faite par le serveur existant après vérification OAuth de la signature, issuer, audience, expiration, nonce et consommation unique du state; Recette continue de refuser toute identité non inscrite, sans bootstrap propriétaire. La lecture distante n'a pas été exécutée ici : aucun connecteur SQL ni binding autorisé n'est accessible. Le SELECT ciblé `identity-google-readonly.sql` permet cette vérification depuis la connexion Neon déjà disponible, avec trois booléens seulement.

Le workflow est épinglé au SHA applicatif c203cd7, à son parent et à son arbre Git exact. Le build préparé enchaîne l'attestation SQL existante puis celle de la configuration Google/identité, avant Next. Les deux fichiers supplémentaires d'attestation sont bornés dans le manifeste d'artefact; crons retirés seulement de la copie Recette. Le contrôleur d'affectation de l'alias est préparé : après READY et vérifications de provenance, vérifier que l'alias n'a pas changé, affecter uniquement ce nom au nouveau déploiement, puis relire l'affectation. L'ancien ID est conservé comme référence de retour arrière. Aucun retry de cette écriture non plus; une réponse incertaine exige arrêt et lecture, sans bascule aveugle.

**Préparation uniquement : écritures désactivées.** L'autorisation précédente visait une unique tentative pour e1d89bb, dont le résultat distant n'est pas connu ici. Elle n'est ni réinitialisée ni réutilisée automatiquement pour c203cd7. Le même marqueur d'autorisation reste conservé; une demande verify_only=false est refusée explicitement. Un GO correspondant à la mise à jour c203cd7 et à l'affectation du seul alias Recette est nécessaire après les preuves distantes. Aucun déploiement, alias modifié, donnée SQL écrite ni appel OAuth réel dans cette intervention.

### Réception de connexion après opération autorisée

1. Contrôler le résumé Actions : application c203cd7, bon projet/custom Environment, build et attestations PASS, READY, alias stable relu sur le nouvel ID. Un ancien alias ou une URL unique ne prouve pas cette livraison.
2. Ouvrir **l'adresse stable directement**, en fenêtre privée. Démarrer et terminer la connexion sur ce même hôte : le nonce est dans un cookie HttpOnly limité à cet hôte. Ne pas démarrer sur l'URL unique puis revenir sur l'alias.
3. Choisir le compte Google déjà inscrit et autorisé. Vérifier le retour sur l'origine stable avec connexion réussie, puis sélectionner uniquement les workspace/client/projet/session déjà accessibles depuis Profil. Aucun compte/droit ne doit être créé en cas de refus.
4. Vérifier le Profil restauré, le Cockpit, puis actualiser et confirmer la même session et le même contexte. Se déconnecter et vérifier le retour verrouillé. Ne partager ni URL de callback avec code/state, ni cookies, ni journaux privés.
5. Ne pas exécuter de mission fournisseur pour tester le login. Drive/Agenda/IONOS et la génération réelle ne sont pas certifiés par cette réception. En cas d'IDENTITY_NOT_ENROLLED, ne pas contourner par bootstrap/email; qualifier le lien d'identité manquant sous autorisation distincte.

Les six fichiers opérateur du nouvel artefact sont figés au commit `3961b29b41c438c24a5b02f0a082657266118664`. Validation : 32 contrôles du contrôleur/alias/prérequis et 27 contrôles OAuth/bindings PASS, SQL et fournisseurs simulés; TypeScript, lint ciblé et `git diff --check` PASS. Les cinq CI c203cd7 sont une preuve transmise par le propriétaire; les CI de cette mise à jour restent à observer sur GitHub. L'identité distante, le client Google réel et l'affectation actuelle de l'alias restent NON ATTESTÉS, sans assimilation à une panne ni création automatique de compte.

## GO de finalisation reçu — opération c203cd7 et alias stable

Le propriétaire autorise explicitement la livraison de c203cd7 et la réception sur l'alias stable, après les contrôles. Les verrous de préparation sont donc remplacés par l'activation conditionnelle manuelle `verify_only=false`, avec CI verte sur le contrôleur, métadonnées vérifiées, attestations PostgreSQL/OAuth/identité READ ONLY avant Next, et affectation du seul alias Recette après READY vérifié. Aucun changement du code applicatif, de l'artefact d'attestation figé ou des credentials. Le marqueur de cette nouvelle autorisation est `pr219-c203cd7-stable-oauth-once`; une occurrence existante interdit toute nouvelle création. Un ancien essai e1d89bb dont l'état n'est pas terminal ou connu interdit aussi le lancement. Ce changement de marqueur répond au nouveau GO, pas à un retry automatique de l'autorisation précédente.

La limite locale reste constatée : API GitHub/Vercel non autorisées par la politique réseau du runtime, aucune identité API ou connexion SQL disponible. Aucun lancement Actions ni aucune écriture Vercel/Neon n'est effectué ici. Les conditions distantes, l'identité réelle et le login ne sont donc pas déclarés vérifiés. Après les cinq CI vertes du contrôleur publié, l'opération unique est le workflow existant sur la même branche avec `verify_only=false`; son résumé fournira ID, URL stable, SHA et état, ou le refus fixe sans retry. L'authentification Google personnelle devra ensuite être réalisée dans le navigateur du propriétaire, sans transmission de credentials à Codex.

## Diagnostic du refus METADATA_ACCESS_UNAVAILABLE — sans relance

Preuve distante disponible : le propriétaire rapporte les cinq CI validées puis l'échec de l'étape « Verify scoped binding metadata and Neon endpoint before any upload » avec `METADATA_ACCESS_UNAVAILABLE`. Le numéro, le SHA et le journal complet du run n'ont pas été fournis; ils ne sont pas lus directement ici car l'API GitHub est interdite par la politique réseau du runtime. Aucun statut HTTP réel ni endpoint fautif n'est donc affirmé.

**Constat démontré sur le contrôleur 950b3d3 :** le même message est produit pour l'absence de `VERCEL_RECETTE_TOKEN`, l'absence de `NEON_API_KEY` ou une réponse HTTP non réussie sur l'un des sept GET (projet, custom Environment, liste des variables, domaines, alias stable, déploiement de l'alias, endpoints Neon). Les erreurs réseau/JSON ordinaires auraient été masquées sous METADATA_REFUSED par son wrapper. Une reproduction par import du blob Git exact confirme cette ambiguïté. Le message transmis ne permet donc pas de conclure à un problème de permissions Vercel, de clé Neon ou d'alias manquant. Une erreur Google, un manque de droits SQL ou une identité non inscrite ne sont pas testés à ce stade; aucun correctif OAuth ou GRANT n'est justifié.

**Défaut du contrôleur corrigé : perte du contexte de lecture.** Le format d'erreur conserve le libellé principal et ajoute uniquement une étape appartenant à une liste fermée, le type (secret absent/HTTP/transport/timeout/JSON) et, pour HTTP, le statut numérique. Aucun corps, header, message fournisseur, secret, URL ou donnée métier n'est publié. Les sept GET, leurs paramètres, l'authentification, la branche Neon et tous les contrôles d'identité sont inchangés. Ce patch répare l'observabilité; il ne prétend pas réparer le refus distant dont la cause n'est pas encore démontrée.

**Autorisation interrompue verrouillée :** les écritures du workflow sont désactivées à nouveau (refus explicite de verify_only=false, étape de déploiement if:false, writesAuthorized:false). Le marqueur d'autorisation n'est pas réinitialisé, aucun état Vercel n'est modifié et aucun workflow manuel n'est lancé, même en verify_only. Pour le chemin du workflow 950b3d3, l'échec de metadata_preflight rend la condition de déploiement fausse : ni upload, ni création, ni alias, ni SQL au build ne sont atteignables après ce refus. Confirmer le SHA et les étapes réellement exécutées dans le run avant de conclure sur son état distant; ne pas extrapoler à d'autres exécutions.

Validation ciblée : 41 contrôles du diagnostic/read-only (dont 35 couples endpoint/statut HTTP), 31 contrôles transport et verrouillage, 9 contrôles d'attestation et d'ordre des étapes : PASS, zéro échec/ignoré. Transports/SQL simulés. `git diff --check` PASS. Aucun build ou campagne navigateur rejoué : code applicatif et artefact approuvé inchangés.

**Reprise sécurisée, non exécutée :**
1. Conserver/consulter le journal du run interrompu : ID, SHA, entrée verify_only, présence masquée des deux clés et état de la première étape d'écriture. Ne transmettre aucune valeur secrète. Confirmer l'état des déploiements du seul projet Recette pour le marqueur courant, par lecture seule, sans créer ni annuler de ressource.
2. Si le journal ne contient pas le statut HTTP (il ne peut pas être reconstruit à partir du seul libellé), effectuer uniquement une lecture diagnostique depuis les connexions Vercel/Neon déjà autorisées, hors workflow de déploiement; le script corrigé fournit l'étape/statut au premier refus, sans POST ni SQL. Ne pas relancer le workflow pour obtenir ce diagnostic. Un 404 seul ne distingue pas ressource absente et ressource masquée par autorisation; un 401/403 ne justifie aucun élargissement automatique du jeton.
3. Corriger seulement le défaut identifié par cette preuve, vérifier les CI, puis demander une autorisation explicite pour toute nouvelle exécution. Ne réutiliser ni ne réinitialiser automatiquement l'autorisation interrompue. Aucune reprise n'est actuellement déclarée GO.

## Run #22 — VERCEL_ALIAS HTTP 404, correction locale de portée

Le propriétaire fournit le résultat réel `METADATA_ACCESS_UNAVAILABLE stage=VERCEL_ALIAS kind=HTTP http=404`. Cela établit que la requête GET d'alias a reçu un 404, après les vérifications projet/custom Environment/variables/domaines. Les clés de contrôle étaient non vides; le secret Neon n'a pas encore été utilisé et aucune lecture SQL n'a commencé. Le 404 ne prouve pas l'absence de l'alias et ne distingue pas, seul, ressource non exposée et défaut d'autorisation.

Requête d251d58 : GET `https://api.vercel.com/v4/aliases/clara-os-recette.vercel.app?teamId=team_0BeqOAO8t5oDEBdzHHdekcxv`, Bearer issu de VERCEL_RECETTE_TOKEN. Route v4, équipe et projet attendus ont été comparés au SDK officiel @vercel/sdk 1.28.53 (`aliasesGetAlias`, `GetAliasRequest`). L'API documente aussi le filtre **optionnel** projectId : retourner l'alias seulement s'il est affecté au projet demandé. Le contrôleur l'omettait.

Correction bornée : ajouter `projectId=prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz` à cette lecture et aux trois lectures équivalentes du contrôleur de déploiement. Même hôte, même alias, même équipe, même jeton; aucune sélection dynamique ou de repli. Les vérifications du projet retourné, du propriétaire, du custom Environment et du déploiement restent inchangées. Un 404 scoped reste bloquant, sans retry global ni création d'alias. Les écritures de déploiement restent désactivées.

**Limite explicite :** le caractère optionnel de ce paramètre ne démontre pas que son omission a causé le 404 réel. Les API Vercel sont inaccessibles depuis ce runtime; ni l'existence ni la propriété effective de cet alias n'ont été relues. Aucun changement de token/droits/domaines n'est justifié par ce seul statut. Le correctif cible explicitement la ressource; sa capacité à lever le refus réel demeure NON ATTESTÉE.

Le test reproduit le GET ancien sans projectId face à une fixture qui exige ce contexte (404), puis vérifie le GET corrigé avec projet/équipe exacts. Il vérifie également qu'un 404 persistant reste refusé en un seul appel et qu'une réponse d'un autre projet est rejetée. Ce comportement simulé n'est pas présenté comme une preuve du fonctionnement interne de Vercel.

Aucun workflow ni déploiement lancé, #22 non relancé. Pas de push : les CI se déclencheraient automatiquement sur cette PR, contrairement à la consigne actuelle. Correctif conservé en commit local; une lecture Vercel autorisée et une autorisation de publication/exécution distincte restent nécessaires avant de conclure à la résolution distante.

Validation locale du bornage : 42 contrôles de métadonnées/diagnostic et 31 contrôles du transport/alias PASS, zéro échec/ignoré, tous transports simulés. `git diff --check` PASS. Aucun build applicatif ou recette fournisseur rejoué; aucune autorité, variable, domaine ou donnée modifié.

## Correction de la confusion Project Domain / Deployment Alias — locale

Nouvelle preuve transmise par le propriétaire : `clara-os-recette.vercel.app` est un Project Domain vérifié du projet indépendant, lisible comme tel, tandis que GET `/v4/aliases/{alias}` renvoie 404. Le contrat officiel du SDK Vercel 1.28.53 distingue GET `/v9/projects/{idOrName}/domains/{domain}` (name, projectId, verified, redirect et customEnvironmentId facultatif) de GET `/v4/aliases/{idOrAlias}` (alias et deploymentId nullable). Le contrôleur confondait la propriété d'un domaine avec une affectation de déploiement déjà existante. Le filtre projectId ajouté précédemment ne corrigeait pas cette précondition erronée.

Le précontrôle utilise désormais le Project Domain exact, sous le projet et l'équipe déjà vérifiés. Il exige name exact, projectId exact, verified=true, aucune redirection et aucun customEnvironmentId étranger lorsqu'il est présent. Aucun GET Deployment Alias ou ancien déploiement n'est requis à ce stade. Un 404/403 de la ressource Project Domain reste bloquant : aucun 404 n'est transformé en PASS.

Le contrôleur préparé conserve cette preuve avant tout upload et la relit après READY pour détecter un changement de propriétaire/configuration avant l'affectation autorisée. Les contrôles équipe/projet/custom Environment/source/artefact du nouveau déploiement restent inchangés. Après affectation, la lecture du Deployment Alias est obligatoire et doit démontrer le nom exact, l'identifiant du nouveau déploiement, l'absence de redirection et un projectId non contradictoire avec le déploiement dont l'identité a été attestée. Un alias encore en 404 ou mal affecté interdit le résultat READY certifié, sans retry ni repli. Aucune ancienne affectation ou ancien deploymentId n'est inventé à partir du Project Domain, qui ne les expose pas.

Tests : reproduction de l'ancien refus face à Project Domain valide + Deployment Alias 404; acceptation du précontrôle corrigé sans consultation prématurée de l'alias; refus des domaines étrangers, non vérifiés, redirigés ou d'un autre environnement; refus avant toute écriture si ownership invalide; aucune affectation après build ERROR; ordre READY puis affectation puis vérification réelle; refus d'un 404 persistant après affectation. 37 contrôles de métadonnées et 34 contrôles du transport PASS, zéro échec/ignoré, transports simulés. `git diff --check` PASS. Aucune nouvelle réception distante n'est présentée comme acquise.

Les verrous d'écriture, marqueurs d'autorisation, branche Neon et contrôles SQL/OAuth restent inchangés. Aucun workflow ou déploiement lancé, aucune mutation distante, aucun push (il déclencherait les CI). Correctif en commit local uniquement. Source applicative c203cd7 et artefact d'attestation figé non modifiés.

## Revue distante consignée et activation unique préparée

Preuve fournie par le propriétaire : six déploiements du projet indépendant, tous READY; dernier `dpl_Cu5cwvJXGJdZzk7LnfRhN1NCXYm5`, source `e1d89bba1cbef31c3d93ca6a3298bbe87c5c05e8`; aucune livraison c203cd7 ni les deux marqueurs recherchés dans les métadonnées retournées. Les runs échoués ont été examinés et se sont arrêtés avant les écritures. Cette revue externe n'est pas présentée comme une nouvelle inspection Vercel depuis ce runtime.

L'activation remplace le verrou inconditionnel par une autorisation explicite `pr219-c203cd7-after-run24-once`, liée au SHA complet du contrôleur approuvé. Elle conserve l'approbation de l'Environment `clara-os-recette`, les cinq CI réussies sur ce même contrôleur, les vérifications de provenance et les attestations réelles avant Next.js. Le simple identifiant public d'opération ne remplace aucune de ces protections. `verify_only` reste vrai par défaut; les deux nouvelles entrées sont vides par défaut.

Avant tout upload, le contrôleur relit la liste Vercel et refuse une liste incomplète, une autorisation courante ou antérieure c203cd7 consommée, un déploiement c203cd7 déjà présent ou un dernier déploiement différent du point revu (ID, READY et SHA non contradictoires obligatoires). Les contrôles projet/équipe/custom Environment/domaine/Neon demeurent bloquants. Les anciennes autorisations ne sont ni réinitialisées ni réutilisées. Le retrait des crons reste limité à l'artefact; aucun code applicatif n'est modifié.

**Conditions d'un nouveau GO :** nommer explicitement le SHA complet de cette révision d'activation, la source applicative `c203cd7229bc544e73b9537102dbf735476e166a`, l'opération ci-dessus et une unique livraison au projet `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`, custom Environment `env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM`, alias `clara-os-recette.vercel.app`. Attendre les cinq CI vertes sur la révision exacte, puis obtenir l'approbation de l'Environment. Les entrées de la seule future exécution sont `verify_only=false`, `release_authorization=pr219-c203cd7-after-run24-once`, `controller_sha=<SHA complet approuvé>`. Ne pas relancer un ancien run. Tout refus, timeout ou résultat incertain impose l'arrêt et une revue avant une nouvelle autorisation; aucun nouvel essai automatique.

Après READY uniquement, l'affectation autorisée du seul alias stable est suivie d'une lecture attestant son rattachement exact au nouveau déploiement. READY sans cette preuve ne constitue pas une livraison certifiée. Les attestations SQL/OAuth en lecture seule, l'absence de privilèges administratifs et les protections fournisseurs restent inchangées.

Validation locale : 73 tests du contrôleur/métadonnées et 9 tests d'attestation PASS, zéro échec/ignoré; transports et SQL simulés. Le test vérifie le payload POST exact à base de fichiers, et non une interdiction textuelle de `gitSource` désormais lu uniquement dans les métadonnées historiques. `git diff --check` PASS. Aucun workflow manuel, upload, déploiement, alias, secret ou donnée distante modifié dans cette opération. Les CI du nouveau commit restent à vérifier sur GitHub; aucun résultat distant n'est inventé.


## Cockpit authentifié sans contexte métier — 30/10/2026

Correctif ciblé issu de d8d1515, sur la branche existante de #219 (préparation de livraison 1e24561 préservée). Aucun changement de nativePage, des fonctions SQL, des identités, des ACL ou du workflow de livraison.

Sans cookie de sélection, HomePage réutilise resolveSoleAuthenticatedWorkspace avec connections:read : session valide non révoquée/non expirée, une appartenance active non ambiguë, rôle member accepté. Aucun workspace par défaut n’est choisi. Une sélection présente, même vide, étrangère ou malformée, conserve le chemin nativePage et ses refus ; aucune erreur d’une sélection ne devient un accueil vide. Une erreur de lecture d’autorité reste bloquante.

L’accueil reprend MainLayout, CockpitLayout, GlassPanel et le même fond architectural extrait sans modification de son dessin. Il affiche « Aucun projet sélectionné » et des informations non chargées, jamais de faux compteurs à zéro. Aucun résolveur opérationnel, store métier, conversation, Agenda, météo, Waze ou fournisseur n’est invoqué. Les commandes métier ne sont pas montées ; le Profil ne demande que le registre autorisé et ses listes de sélection sur action explicite, sans Contacts ni runtime métier automatique. Le sélecteur distingue succès avec liste vide, 401, 403, 503/erreur réseau, avec textes dans les cinq langues. Les autres pages et les contextes natifs complets gardent leur protection.

Preuves : cockpit-landing-tests.txt, src/tests/cockpit-landing.test.ts et src/tests/cockpit-landing-browser.e2e.mjs. 10 tests unitaires/auth/isolation PASS, 1 recette Chromium PASS sur Next optimisé + PostgreSQL 17 jetable (cinq langues, rechargement, aucune API métier sur l’accueil, liste clients vide, erreurs 401/403/503 simulées, session absente/expirée/révoquée, appartenance révoquée et sélection malformée réellement refusées). Zéro chargement SQL global enregistré par le harnais. Les identités et révocations de ces tests sont exclusivement synthétiques et locales. Aucun test Google réel n’a été rejoué : la connexion réelle précédente est un acquis fourni par le propriétaire.

TypeScript, ESLint ciblé et git diff --check PASS. Build Webpack optimisé PASS avec les fichiers Geist locaux via NEXT_FONT_GOOGLE_MOCKED_RESPONSES, sans changer les polices ni les dépendances applicatives. Installation reproductible effectuée avec npm 10 (version de la CI Node 22), sans modifier le lockfile ; npm 11 du runtime refusait initialement les métadonnées de peers optionnels du lockfile. La première recette navigateur utilisait à tort un attribut value explicite sur une option dont la valeur est implicite ; le registre répondait correctement 200. Le sélecteur de test a été remplacé par le repérage existant du premier select de la région canonique ; aucun timeout augmenté, clic forcé ou retry ajouté.

Le workflow natif existant inclut les deux nouveaux tests et n’ajoute aucun déploiement. La CI distante de ce correctif reste à constater après publication. Réserve historique HTTP 503 conservée ; aucune certification Production ou fournisseur n’est prononcée. Aucune écriture distante, nouvelle identité réelle, migration, activation d’invitation ou livraison effectuée. Les références de déploiement restent inchangées : ce correctif n’est pas encore servi par Vercel.


## Correction du harnais CI native-authority sur d2314f8f

Échec reproduit à l’identique : « all six native server pages return before invoking any global data loader », assertion 1 !== 0 sur src/app/page.tsx. Le harnais remplaçait tous les imports par des proxys de loaders métier ; le nouvel appel légitime à cookies() était donc compté comme un chargement global, puis interrompait le contrôle avant la résolution d’authentification. Aucun accès global réel n’a été démontré.

Correction exclusivement dans le test : next/headers dispose d’un faux cookie explicite ; le vrai classificateur cockpitLanding est exécuté, avec un résolveur d’autorité contrôlé. Les lectures de cookie/d’autorité sont comptées séparément et les proxys métier restent interdits. L’assertion zéro loader métier reste inchangée pour les six pages. Un test complémentaire du vrai handler HomePage couvre membre actif, sessions expirée/révoquée, appartenance révoquée, ambiguïté, erreur d’autorité, cookies malformé/dupliqué et sélections malformée/étrangère : aucune de ces branches ne lance de loader métier ; toute sélection fournie reste déléguée à nativePage.

Commande : node --import tsx --test src/tests/native-authority.test.ts src/tests/cockpit-landing.test.ts src/tests/recette-auth-isolation.test.ts src/tests/authenticated-workspace-session.test.ts. Résultat : 21 PASS, 0 FAIL, 0 SKIP, dont 38 refus de handlers natifs contrôlés. ESLint du fichier modifié et git diff --check PASS. Cookies, résolveurs et transports simulés ; aucune session réelle consultée. Code applicatif, ACL, SQL, workflow et rendu Cockpit strictement inchangés ; pas de nouvelle campagne navigateur/build sur ces octets déjà reçus. CI distante à constater sur le nouveau SHA après publication. Aucun merge, déploiement ou accès fournisseur.


### Isolation du journal SQL de la recette Cockpit — 30/10/2026

Base examinée : `3d8e913907601e16b7af6cc16d4897a6f8d930fc`.
L’accueil seul passe. L’enchaînement navigation Cockpit puis accueil reproduit
exactement l’échec ligne 50 : `GLOBAL_LOADER_ATTEMPT` au lieu de la chaîne vide.
La requête rejetée est `CREATE TABLE IF NOT EXISTS clara_connections`, émise par
le statut Microsoft lors de la visite préalable de Connexions :
`ConnectionsHub` → `/api/connections/microsoft` → `DatabaseConnectionRepository.initialize`.
Ce marqueur préexiste à l’accueil sans projet ; il ne provient pas de cet accueil.
Le harnais bloque cette requête et ne permet aucune lecture globale effective.

Correction limitée au workflow natif : après la recette de navigation, arrêt du
serveur, nouvelle base PostgreSQL jetable avec le provisionnement existant,
puis redémarrage avant la recette sans projet. Le précédent journal reste
conservé sous son identifiant de base ; aucun effacement, filtrage ou
élargissement de l’allowlist SQL. Le test ligne 50 et le préchargement sont
strictement inchangés. La fixture distincte du hub reste également conservée.
Aucun changement applicatif, identité, ACL, enrôlement, connexion ou Production.

Validation locale sur le même build optimisé :
- Navigation Cockpit, refus natifs et reprise durable : 1/1 PASS.
- Enchaînement sans isolation : FAIL exact reproduit ligne 50.
- Accueil avec fixture neuve : 1/1 PASS, zéro tentative SQL globale, cinq langues,
  rechargement, sélection invalide, sessions absentes/expirées/révoquées et
  appartenance révoquée refusées ; listes vides distinctes des 401/403/503.
- Tests native-authority, cockpit-landing, recette-auth-isolation et
  authenticated-workspace-session : 21 PASS, 0 FAIL, 0 SKIP.
- TypeScript, lint ciblé, YAML et syntaxe shell du workflow : PASS.
- Aucun fournisseur réel, migration distante, merge ou déploiement.

Les cinq CI distantes doivent être vérifiées sur le nouveau SHA ; les résultats
locaux ne constituent pas une attestation de leur réussite.
