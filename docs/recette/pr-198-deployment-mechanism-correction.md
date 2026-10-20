# PR #198 — correction ciblée du mécanisme de déploiement

## Cause démontrée et limites

Le propriétaire a relevé dans le run [39371947718](https://github.com/gildaspro5613-code/clara-os/actions/runs/39371947718) : `Not able to load user because of unexpected error: User not found. (404)`. Les vérifications strictes du projet/équipe avaient réussi. Le propriétaire confirme qu'aucun déploiement du source approuvé n'a été créé.

La CLI passait `--scope melodie-digital`. Dans le code officiel examiné, cette option entre dans la résolution de scope qui appelle `getUser(client)` avant le déploiement ; `getUser` demande `/v2/user` sans scope équipe. Ce chemin affiche exactement le préfixe d'erreur observé. Un jeton accepté pour les métadonnées d'un projet n'est pas, à lui seul, une identité utilisateur personnelle compatible avec cette résolution. Le 404 utilisateur ne prouve ni un mauvais Project ID ni l'absence de droits de création de déploiement.

Preuves officielles, épinglées :

- [Résolution CLI du scope, appel utilisateur et message d'erreur](https://github.com/vercel/vercel/blob/c628be7835e03a965b93e9cf9e2bd5ac2acbf5eb/packages/cli/src/index.ts#L781).
- [Appel `/v2/user` de la CLI](https://github.com/vercel/vercel/blob/c628be7835e03a965b93e9cf9e2bd5ac2acbf5eb/packages/cli/src/util/get-user.ts#L24).
- Le paquet officiel `vercel@64.7.0` a aussi été inspecté, sans exécuter la CLI. Le workflow défaillant installait `vercel@latest` : **sa version historique exacte n'est pas attestée** par les logs disponibles ici. La chaîne d'erreur et le chemin ci-dessus concordent ; ne pas transformer cette inspection en test réel du jeton.

## Correctif préparé — aucune nouvelle exécution

Le même workflow manuel utilise désormais directement le protocole REST officiel. Aucune installation de CLI, résolution de compte utilisateur ou modification de scope du jeton. Le diagnostic ancien `/v2/user` reste uniquement dans la branche d'erreur du précontrôle ; il n'est pas une condition de succès du déploiement REST.

1. Le checkout et le contrôle SHA restent `b2a51dd59381daa1e5d3278f3d7104b986015170`. Aucun fichier applicatif modifié.
2. Vérification stricte du projet `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`, nom `clara-os-recette`, équipe `team_0BeqOAO8t5oDEBdzHHdekcxv`, projet non lié à Git ; aucun repli.
3. Lecture des environnements du projet, correspondance unique ID `env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM` et slug `clara-os-recette`, **avant tout POST**.
4. Lecture des fichiers depuis les objets Git du SHA approuvé, jamais depuis les fichiers locaux de configuration/secrets. Fichiers non suivis exclus, liens symboliques/sous-modules/chemins sensibles refusés. Seule transformation : suppression des deux crons existants dans l'artefact, comme auparavant. La copie de travail et les données runtime ne sont pas téléversées.
5. Upload des contenus via `POST /v2/files?teamId=…`, puis **un seul** `POST /v13/deployments?teamId=…` avec `project` fixé et `customEnvironmentSlugOrId` fixé à l'ID ci-dessus. Aucun `target=production`, projet créé, `gitSource`, `projectSettings`, `env` ou secret recopié dans le corps.
6. Contrôle du projet, propriétaire équipe, environnement, URL et SHA de provenance renvoyés ; état `READY` publié seulement après vérification. Une création connue mais non encore vérifiée est signalée comme telle, sans faux succès.
7. Lecture du statut de ce seul déploiement. Aucun nouvel essai automatique de POST, aucun renvoi après timeout, acquittement perdu, réponse ambiguë ou échec du build. Les réexécutions GitHub du même run sont refusées avant upload ; une nouvelle tentative exige analyse de l'état précédent et nouvelle autorisation.

`verify_only` reste vrai par défaut. Le bloc REST et son Node.js contrôleur sont conditionnés à `verify_only == false`. Secret exclusivement `VERCEL_RECETTE_TOKEN` dans l'Environment GitHub `clara-os-recette`, sans repli générique. Le jeton n'est jamais imprimé. Les erreurs REST utilisent des codes fixes et le statut HTTP, sans corps fournisseur, contenu de fichier, en-têtes ou traces sensibles. L'URL/ID du déploiement sont des métadonnées publiques, distinctes des secrets.

Contrats officiels utilisés :

- [SDK officiel : création, endpoint `/v13/deployments`, authentification Bearer](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/src/funcs/deploymentsCreateDeployment.ts#L98).
- [Champs de création : fichiers, projet et sélection explicite du custom Environment](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/src/models/createdeploymentgitsource1.ts#L484).
- [SDK officiel : upload `/v2/files`, corps binaire et digest](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/src/funcs/deploymentsUploadFile.ts#L98).

## Permissions nécessaires — aucune extension effectuée

Le jeton actuel conserve son périmètre. Les lectures déjà réussies du projet ne prouvent pas les capacités suivantes :

| Opération | Droit fonctionnel nécessaire | État réel |
|---|---|---|
| GET projet exact | Lecture métadonnées du projet Recette | Réussie au précontrôle antérieur |
| GET custom Environments du projet | Lecture de l'environnement Recette | Non testé dans cette intervention |
| POST `/v2/files` | Upload de sources pour le futur déploiement Recette | Non testé |
| POST `/v13/deployments` avec projet/environnement fixes | Création d'un déploiement uniquement sur Recette | Non testé |
| GET déploiement créé | Lecture du statut/métadonnées de ce déploiement | Non testé |

**Limite importante : `/v2/files` est une API liée à l'équipe, sans paramètre Project ID dans le contrat officiel. Sa disponibilité avec le jeton restreint au projet n'est pas démontrable par les seuls tests hors ligne.** Si Vercel refuse cet endpoint ou exige un scope global/accès à d'autres projets pour l'autoriser : STOP, ne pas élargir le jeton, ne pas utiliser un jeton personnel ou Production. Un 401/403 identifie l'opération refusée sans déclencher de repli. Les noms de permissions ci-dessus décrivent les opérations nécessaires, pas des scopes OAuth inventés ou une capacité Vercel supposée disponible.

Aucune nouvelle permission n'est accordée ou requise automatiquement. Avant une éventuelle exécution, le propriétaire doit confirmer que les capacités d'upload/création peuvent être accordées dans le périmètre autorisé. Sinon le blocage reste administratif/contractuel ; la correction ne le masque pas.

## Tests hors ligne et périmètre

Commande depuis la branche corrective :

```sh
node --test .github/scripts/recette-deployment-api.test.mjs
```

11 tests réussis, 0 échec, 0 ignoré, sous Node.js 24. YAML et diff vérifiés. Les tests exécutent le code REST réellement intégré au workflow, avec transport simulé ; ils couvrent absence de lookup utilisateur, projet/équipe/environnement étrangers, défaut de secret, mauvais SHA, binaire et digest, absence de copie d'un `.env.local` non suivi, refus d'upload, création unique, timeout/5xx incertains, cible créée divergente et échec/reprise de lecture du build. Un clone local jetable du véritable SHA approuvé vérifie aussi le manifeste réel et la conservation des octets applicatifs, sans accès réseau fournisseur.

Aucun nouveau test métier général, TypeScript/build applicatif ou campagne PostgreSQL : aucun code applicatif modifié. Les validations métier déjà reçues restent distinctes ; ces tests ne certifient ni le jeton réel, ni Vercel/Neon, ni Google, ni un fonctionnement HTTP déployé.

Fichiers modifiés : ce document ; `.github/workflows/clara-os-independent-recette.yml` ; `.github/scripts/recette-deployment-api.test.mjs`.

**Statut : correctif proposé et testé hors ligne ; NO-GO pour relancer maintenant.** Aucun workflow lancé, aucun upload/création Vercel, aucun changement de secret/permission, aucun déploiement, merge, migration ou changement Production/Clara Live. Toute nouvelle tentative nécessite une autorisation explicite distincte. Un éventuel `READY` ultérieur resterait une validation technique, pas une réception métier ou une attestation des bindings Neon.

## Précontrôle étendu — 20 octobre 2026

Le mode `verify_only=true` exécute désormais une étape inconditionnelle supplémentaire : GET du projet par son ID exact, puis GET `/projects/prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz/custom-environments?teamId=team_0BeqOAO8t5oDEBdzHHdekcxv`. Elle exige l'équipe et le projet attendus, une seule correspondance ID/slug `env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM` / `clara-os-recette`, et refuse un éventuel `projectId` contradictoire. Le rattachement est établi par l'endpoint projet exact, sans inférence depuis le seul nom. Le secret reste exclusivement `VERCEL_RECETTE_TOKEN` de l'Environment GitHub Recette. Le SHA applicatif épinglé reste `b2a51dd59381daa1e5d3278f3d7104b986015170` ; aucun code applicatif modifié.

Cette étape ne possède que deux chemins GET, sans upload, création, renouvellement, repli ni retry. Au premier HTTP non réussi, y compris 401/403, elle échoue sans requête supplémentaire. La sortie publique est limitée aux identifiants attendus et au statut `READ_ONLY_BINDINGS_PASS ... WRITE_PERMISSIONS_NON_ATTESTED`, ou à un code d'erreur fixe. Aucun contenu brut du fournisseur, secret ou en-tête n'est journalisé. Les contrôles de déploiement restent également présents ; aucune permission d'écriture n'est déduite d'un GET réussi.

### Documentation officielle consultée

Sources Vercel officielles figées au commit SDK `7930cccab102f0a29dfe0bdd66897edf6a8b006f` :

- [Documentation Deployments](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/docs/sdks/deployments/README.md) : authentification Bearer, upload préalable, création par fichiers ou petits fichiers inline.
- [UploadFileRequest](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/docs/models/uploadfilerequest.md) et [implémentation officielle](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/src/funcs/deploymentsUploadFile.ts) : POST `/v2/files`, sélecteurs `teamId`/`slug`, aucun sélecteur de projet.
- [CreateDeploymentRequest](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/docs/models/createdeploymentrequest.md) et [implémentation officielle](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/src/funcs/deploymentsCreateDeployment.ts) : POST `/v13/deployments`, projet et custom Environment dans le corps, authentification Bearer.
- [Scopes du modèle AuthToken](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/docs/models/scopes.md) : variantes user/team ; ce modèle n'atteste pas les capacités du jeton Recette réel.

Le site documentaire `vercel.com` n'est pas accessible depuis cet exécuteur ; les sources officielles GitHub ci-dessus sont accessibles. **Compatibilité du jeton limité au projet pour chacun des deux POST : NON ATTESTÉE.** Aucun de ces contrats ne fournit une garantie suffisante pour le principal restreint réel. Cela ne démontre pas non plus une incompatibilité. Aucun POST de découverte, changement de jeton ou élargissement n'est autorisé par cette passe.

Action minimale restante : obtenir de Vercel une confirmation explicite que le principal du jeton dédié peut utiliser ces deux endpoints dans le périmètre du seul projet Recette, sans transmettre sa valeur. En cas d'incompatibilité officielle, arrêter le mécanisme actuel et soumettre une alternative avant intervention ; aucune alternative ni coût supplémentaire n'est engagé ici. L'inline officiellement documenté ne suffit pas à prouver les permissions de création et ne résout donc pas à lui seul cette incertitude.

### Validation hors ligne

`node --test .github/scripts/recette-deployment-api.test.mjs` : **14 tests réussis, 0 échec, 0 ignoré**. Les trois nouveaux tests couvrent le vrai code précontrôle extrait du YAML, son exécution inconditionnelle en mode vérification, les identités et environnements divergents/dupliqués, les HTTP 401/403 sans retry, les erreurs réseau/JSON et l'absence totale de POST. Les 11 tests REST antérieurs restent verts. YAML chargé par `js-yaml` et `git diff --check` réussis. Ces tests utilisent un transport simulé et ne certifient aucune permission Vercel réelle.

Fichiers concernés uniquement : workflow existant, tests REST existants, présent rapport. La preuve du précontrôle réel et son SHA contrôleur sont fournis par le run manuel GitHub Actions associé ; elle ne vaut jamais attestation Neon, permission d'upload/création ou réception métier.

## Proposition gitSource — remplace l'upload, mais SHA actuel NON DÉPLOYABLE par ce garde

Cette section remplace la proposition d'upload décrite plus haut. Le workflow n'appelle plus `/v2/files` et ne transmet plus `files`. Il prépare exclusivement POST `/v13/deployments` avec :

```json
{
  "project": "prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz",
  "name": "clara-os-recette",
  "customEnvironmentSlugOrId": "env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM",
  "gitSource": {
    "type": "github",
    "repoId": "1316164838",
    "ref": "b2a51dd59381daa1e5d3278f3d7104b986015170",
    "sha": "b2a51dd59381daa1e5d3278f3d7104b986015170"
  }
}
```

Le repo ID `1316164838` a été confirmé par GET GitHub du dépôt `gildaspro5613-code/clara-os`. Le checkout et le driver vérifient le SHA, le type commit et le remote GitHub exact. Le projet Vercel doit désormais présenter un lien GitHub existant avec ce repo ID, `org=gildaspro5613-code`, `repo=clara-os`, `type=github`. Un projet non lié est refusé ; aucun lien n'est créé ou modifié automatiquement. Le dernier précontrôle réel du contrôleur précédent exigeait au contraire l'absence de lien : **il ne prouve pas cette nouvelle précondition**. L'état actuel du lien reste NON VÉRIFIÉ, aucun nouveau contrôle Vercel n'ayant été lancé dans cette passe.

Référence officielle : [GitSource2 dans le SDK Vercel](https://github.com/vercel/sdk/blob/7930cccab102f0a29dfe0bdd66897edf6a8b006f/src/models/createdeploymentgitsource1.ts), champs `type=github`, `repoId`, `ref`, `sha`. Le même contrat précise que `files` et `gitSource` sont mutuellement exclusifs et que `customEnvironmentSlugOrId` remplace la cible déduite. Aucun `gitAccessToken`, réglage projet, `withLatestCommit` ou branche mobile n'est envoyé. La déclaration utilisateur rapportant les droits projet de Vercel est conservée comme provenance administrative ; elle ne devient pas un test réel du POST.

### Blocage démontré : deux schedules dans le SHA approuvé

Le véritable `git show b2a51dd59381daa1e5d3278f3d7104b986015170:vercel.json` contient :

| Route | Schedule |
| --- | --- |
| `/api/internal/document-operations-purge` | `0 3 * * *` |
| `/api/internal/event-jobs-run` | `* * * * *` |

Le mécanisme précédent supprimait ces deux entrées dans les fichiers uploadés. Avec `gitSource`, Vercel récupère le fichier Git original ; modifier localement ce fichier serait sans effet. Le contrat de création consulté ne fournit pas d'override `crons` permettant de reproduire cette suppression. La présence de ces déclarations ne prouve pas leur activation sur un custom Environment ; leur inactivité n'est toutefois pas attestée ici. Ni l'absence supposée de `CRON_SECRET`, ni les refus des transports métier ne prouvent l'absence de lancement d'un worker.

Le garde choisi refuse donc les schedules non vides avant tout HTTP du driver, avec **`GIT_SOURCE_CRONS_PRESENT_NO_DEPLOYMENT`**. Un test utilise les vrais octets Git du SHA approuvé et reproduit ce refus, sans altération du fichier. Les tests de création réussie utilisent explicitement une configuration synthétique sans cron ; **ils ne valident pas le déploiement réel de b2a51dd**.

### Décision et action minimale

**NO-GO pour déployer le SHA actuel par ce mécanisme.** Deux préconditions restent :

1. Confirmer un lien GitHub exact du projet Recette. Le projet était non lié au dernier précontrôle. Toute connexion éventuelle doit faire l'objet d'une autorisation distincte et préserver l'interdiction des déploiements automatiques/Preview ; aucune modification de Vercel n'a été effectuée.
2. Résoudre les schedules : soit obtenir une preuve officielle et vérifiable de leur inactivité sur le custom Environment, puis autoriser une adaptation ciblée du garde ; soit autoriser un nouveau SHA de recette retirant uniquement les schedules. La seconde option change le SHA et n'est donc pas appliquée sous l'exigence actuelle d'épinglage strict à b2a51dd. Aucune désactivation projet, configuration globale ou nouvelle infrastructure n'est proposée automatiquement.

Cette proposition n'ajoute aucun service ni abonnement. Un futur déploiement Git exécuterait un build Vercel selon la facturation existante ; aucun build n'a été lancé. Le retrait de `/v2/files` élimine l'incertitude spécifique aux permissions d'upload, sans certifier la permission réelle de création ou la liaison GitHub.

### Tests et sécurité

15 tests hors ligne, 15 réussis, 0 échec, 0 ignoré ; YAML chargé et `git diff --check` réussis. Les assertions devenues propres à l'ancien upload ont été remplacées par celles de l'absence d'upload et du contrat Git, sans suppression des exigences de sécurité : projet/équipe/source/custom Environment, 401/403, faux reçus, ID/URL ambigus, acquittement perdu, 408/5xx, contrôle de source après polling, refus sans second POST. Le précontrôle GET reste accessible avec `verify_only=true` par défaut, mais ne constitue pas un GO de déploiement et n'est pas relancé ici.

Le driver vérifie aussi `gitSource` réel renvoyé par Vercel avant tout état READY ; un reçu dépourvu de repo ID, SHA ou référence conforme reste incertain, sans deuxième création. Secret dédié inchangé, une seule création possible, aucun retry POST, aucun repli Production. Aucun workflow, upload, déploiement, merge, migration Neon ou intervention Production/Clara Live exécuté dans cette passe.

## Source Recette sans crons — clôture ciblée

La source autorisée est désormais **`6cfed8f80f9b8451d5698ca1040bcf42d513c4f2`**, parent unique **`b2a51dd59381daa1e5d3278f3d7104b986015170`**. Son seul fichier modifié est `vercel.json` : suppression du tableau `crons`, conservation de `$schema`. Aucun fichier métier, migration, dépendance ou contrat n'a changé. Le diff et le parent ont été vérifiés localement puis par l'API GitHub du commit.

Référence de conservation : tag `recette-pr198-source-no-crons-v1`, publié sans branche supplémentaire, sans nouvelle PR et sans merge. Le workflow utilise le SHA complet, jamais le tag comme référence mobile. La référence sert exclusivement à rendre la source disponible au clone Git Vercel ; elle n'autorise aucun déploiement. Les workflows automatiques recensés sont limités à des branches/PR ou à un déclenchement manuel, pas à ce tag.

### Protection de la promotion Production

Le commit Recette est une divergence de b2a51dd, **pas un ancêtre de la branche de la PR #198**. Il n'est ni fusionné ni cherry-pické dans cette branche. Le `vercel.json` de la branche #198 reste identique octet pour octet à celui de b2a51dd, avec ses deux crons. Le fichier `vercel.json` ne fait donc pas partie du diff de cette correction dans la PR. Les tests imposent cette conservation et l'absence du commit Recette dans l'ascendance de la PR.

Lors d'une promotion ultérieure, utiliser le code métier de la lignée PR/Production, **jamais le tag ni le SHA Recette**. Vérification préalable obligatoire : `git diff --exit-code b2a51dd59381daa1e5d3278f3d7104b986015170 <SHA_PROMOTION> -- vercel.json`, puis contrôle des deux schedules. Si le fichier évolue légitimement, cette différence exige une revue explicite ; elle ne doit jamais être ignorée. Cette séparation garantit que fusionner les changements ordinaires de #198 ne propage pas la suppression des crons. Elle ne constitue pas une autorisation de promouvoir le commit Recette.

### Garde de provenance et tests

Le workflow a été épinglé au nouveau SHA après les vérifications de contenu. Checkout `fetch-depth: 2`, parent immédiat b2a51dd et diff limité à `vercel.json` vérifiés également au précontrôle. Le driver confirme en plus que le JSON est exactement celui du parent moins `crons`. Parent incorrect, autre fichier modifié, changement supplémentaire de configuration ou réapparition d'un cron sont refusés avant toute requête du driver. Secret dédié, projet/équipe/custom Environment, référence GitHub, absence de POST retry et `verify_only=true` par défaut sont conservés. Le premier précontrôle metadata s'arrête désormais aussi sans sondes supplémentaires après un échec HTTP.

**18 tests ciblés réussis, 0 échec, 0 ignoré** (`node --test .github/scripts/recette-deployment-api.test.mjs`), YAML et diff validés. Les tests utilisent les vrais objets Git pour vérifier la source et la préservation Production, et un transport simulé pour les appels REST. Ils ne certifient aucun POST réel.

### Liaison GitHub : contrôle et intervention éventuelle

Seul `verify_only=true` peut être lancé dans cette intervention. Il lit GET `/v9/projects/clara-os-recette?teamId=team_0BeqOAO8t5oDEBdzHHdekcxv`, vérifie l'identité exacte, puis exige `link.type=github`, `link.repoId=1316164838`, `link.org=gildaspro5613-code`, `link.repo=clara-os`. Une liaison absente produit `RECETTE_GITHUB_LINK_ABSENT`, une liaison différente `RECETTE_GITHUB_LINK_MISMATCH`. Le résultat réel et son lien d'exécution sont consignés dans la PR et le rapport de livraison ; l'ancien PASS d'un projet non lié ne vaut pas validation de cette condition.

Si liaison absente : **NO-GO** jusqu'à une autorisation distincte de connexion. Intervention propriétaire : Vercel → équipe Mélodie Digital → projet `clara-os-recette` (ID exact `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`) → Settings → Git → Connect Git Repository → dépôt exact `gildaspro5613-code/clara-os` (ID `1316164838`). Ne pas utiliser le projet Clara OS Production. L'intégration GitHub Vercel doit autoriser la lecture de ce dépôt ; aucune valeur de jeton n'est à transmettre.

**Effet de sécurité à traiter avant connexion :** le lien Git peut rendre les pushes/PR éligibles à des déploiements automatiques Production ou Preview, et la connexion peut proposer un premier déploiement. Il faut convenir et vérifier les règles d'absence de déploiements automatiques (y compris custom Environment), la branche Production du projet indépendant, les Branch Tracking, les règles de build et l'accès de l'app GitHub avant cette opération ; l'ancien Ignored Build Step ne suffit pas à garantir à lui seul l'absence de déploiement créé. Ne pas accepter de premier déploiement, ne pas connecter sans accord, ne pas modifier les règles Production de l'autre projet. Une fois la connexion autorisée et sécurisée, relancer uniquement le précontrôle manuel ; aucune création REST tant que ce contrôle n'est pas réussi.

Aucun projet n'est connecté par cette correction. Aucun upload, création de déploiement, migration, merge ou intervention Production/Clara Live autorisé dans cette passe.
