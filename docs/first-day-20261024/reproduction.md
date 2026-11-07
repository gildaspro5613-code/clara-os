# Reproduction et préservation — sans publication ni déploiement

Référence préservée : `fff3fb2384b88c9830e5f22a29bed1110130b791`.
Bundle initial vérifié : `/workspace/clara-os-v1-candidate-20261024.bundle`.
**Prérequis de restauration :** objet `01e3d253ea435d99462e5f80ba68c9c5e0582986`
(PR #202). Le bundle est incrémental : il ne prétend pas contenir toute l’histoire.
Ne jamais restaurer avec un reset destructif ou dans un checkout sale.

La branche locale unique `reception/os-v1-first-day-20261024` descend de la branche
candidate précédente, conservée sans réécriture. #176 → #199 → #202 restent Draft.
Aucun push ni nouvelle PR n’est autorisé par ce lot.

## Tests réellement exécutés

Dans le checkout candidat, Docker local vérifié et conteneur de test existant :

```sh
CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test \
  src/tests/native-mail-postgres.test.ts \
  src/tests/native-mail-overview-priority.test.ts \
  src/tests/native-mail-panel-reliability.test.ts \
  src/tests/native-mail-triage.test.ts \
  src/tests/native-job-kind-compatibility.test.ts
node --import tsx --test src/tests/native-authority.test.ts \
  src/tests/ionos-transport.test.ts src/tests/native-mail-monitor.test.ts \
  src/tests/make-connector.test.ts
node --import tsx --test src/tests/i18n-consolidation.test.ts
npx tsc --noEmit
npm run build
```

Lint : les fichiers applicatifs et harnais modifiés, sans désactiver les règles.
Les 125 résultats historiques sont conservés, **pas additionnés** aux nouveaux.
La restauration `pg_dump` locale est rejouée dans le premier groupe. Aucune base
Neon, donnée réelle ou permission distante n’est utilisée.

## Navigateur

Le runner local `evidence/run-browser.py` conserve les commandes réellement
utilisées : fixture existante → Next.js compilé → proxy HTTPS loopback → Chromium
installé → arrêt réel de Next → reprise dans un nouveau navigateur. Il ne déploie
rien. Les noms de base sont uniques et contrôlés ; seules ces bases sont supprimées
à la fin. Il restaure les fichiers TLS locaux antérieurs, et ne redémarre pas de
service fournisseur.

Le runner fourni conserve les chemins de cette instance. Pour le réexécuter,
l’opérateur doit vérifier ces chemins, disposer du même conteneur PostgreSQL local,
du checkout et de Chromium déjà installés. Ne pas remplacer les paramètres fictifs
par des secrets réels. Les ports 3908/3910 doivent être libres. Ne pas lancer en
parallèle avec un autre test utilisant le proxy.

`V1_FIRST_DAY=true` ajoute la journée guidée au parcours documentaire existant.
Le mail est routé vers le véritable handler avec injection du transport simulé ;
ce n’est **pas** une certification HTTP fournisseur ou un SMTP réel. Toutes les
persistances métier passent par PostgreSQL. Les autres pages et routes passent par
le serveur Next. Les requêtes externes du navigateur sont refusées et les fournisseurs
serveur sont remplacés par le preload de test existant ; IONOS réseau et surveillance
sont explicitement désactivés. Aucun système de simulation permanent n’est ajouté
à l’application.

Les journaux de session, cookies, clés TLS, dumps et chaînes de connexion restent
hors dossier publié/archivé. La copie du runner ne contient que paramètres de
fixture et chemins, jamais des credentials opérationnels.

## Production reste une opération distincte

Aucune nouvelle migration depuis le candidat initial : 025/026/028 sont préservées.
Ordre et dépendances : `../reception-v1-20261024/recovery-and-migrations.md`.
Ne pas rejouer aveuglément les anciennes migrations sur une base avancée.

Avant tout usage réel : autorisation, cible et rôle SQL attestés, copie isolée,
export et restauration éprouvés, conservation des clés/chiffrements/reçus,
drainage des anciens workers, contrôle des automatisations et réception fournisseur
sur un SHA exact. Une ancienne restauration après un effet externe peut créer un
risque de doublon ; les reçus et opérations incertaines doivent être réconciliés,
jamais supprimés ou rejoués automatiquement.
