# Clara OS V1 — réception transverse J1, 24 octobre 2026

**GO réception utilisateur en environnement isolé, limitée au parcours guidé synthétique décrit. Production : NO-GO.**
Ce dossier succède à `docs/reception-v1-20261024/` et ne remplace ni ne réécrit ses
preuves. Il distingue le produit complet de l’essai guidé minimal utilisable.

## Candidat conservé

- Ancien candidat intact : `consolidation/os-v1-reception-20261024`,
  `fff3fb2384b88c9830e5f22a29bed1110130b791`.
- Branche unique de ce lot : `reception/os-v1-first-day-20261024`.
- Correctif applicatif : `2e5af6872b82585770b498d0045ef4c3f077b9e0`.
- Harnais final : `dd1ff5a9414924090d62b69f213c04c0d9deb75c`. Le SHA documentaire final sera fourni dans le bilan. Les derniers commits de
  harnais n’altèrent pas le code applicatif compilé.
- Base nécessaire au bundle initial : #202,
  `01e3d253ea435d99462e5f80ba68c9c5e0582986`. Bundle vérifié par Git, aucune
  restauration destructive. Les 137 preuves historiques sont intactes.

| GitHub vérifié en lecture seule | SHA observé | État |
|---|---|---|
| [#176](https://github.com/gildaspro5613-code/clara-os/pull/176) | 22ee77e03701c6d581678a5b309a431074d7e7b7 | OPEN Draft |
| [#199](https://github.com/gildaspro5613-code/clara-os/pull/199) | d3dbe8effb9812ad3b07c4287550172ec9a72d49 | OPEN Draft, base #176 |
| [#202](https://github.com/gildaspro5613-code/clara-os/pull/202) | 01e3d253ea435d99462e5f80ba68c9c5e0582986 | OPEN Draft, base #199 |

Aucune publication. Aucun merge, déploiement, migration distante, modification
fournisseur, email ou appel réel. Aucun changement Clara Live/IONOS V1.

## Deux correctifs métier nécessaires, pas de reconstruction

1. Le Cockpit n’affichait pas les opérations de courrier en attente alors qu’elles
   existaient dans `clara_native_mail_operations`. L’overview réutilise désormais
   **la commande canonique existante** `operations`, avec ses droits utilisateur,
   workspace/client/projet, et ne projette que ID/mission/état. Il ne renvoie ni
   contenu figé, credential, jeton, destinataire ni condensat d’approbation.
   Le panneau présente les états enregistrés et ouvre la Messagerie existante.
   Aucune approbation/envoi n’est déclenché depuis le Cockpit. Les limites 50
   opérations/aperçu partiel sont explicites ; pas de promesse d’exhaustivité.
2. Le panneau nommé « Résumé du jour » comptait uniquement les tâches/messages
   du fil et de la mission active. Il indique désormais **« Résumé de la mission
   active »**, dans cinq langues, et précise qu’une tâche cochée/approbation ne
   prouve pas un effet fournisseur. Aucun nouveau moteur de synthèse/Brief/Journal.

Les décisions restent dans les registres existants ; la présentation ne les
modifie pas, ne les archive pas et ne déclare pas leur validité future. Une nouvelle
action impose la revérification déjà présente des droits et du contenu exact.

## Réception transverse

- [Matrice fonctionnelle](transverse-matrix.csv) : code, isolation, fournisseur,
  parcours, importance J1, statut et limite. Les déclarations du propriétaire sur
  Google/Agenda/Drive/Twilio/ElevenLabs sont conservées. Sans version et environnement
  précis, elles ne sont pas transformées en certification de ce candidat.
- [34 scénarios](scenarios-34.csv) : 24 PASS isolés, 8 PARTIEL, 2 BLOQUÉ historiques,
  conservés avec leurs SHA et décisions J1. Les scénarios bloqués B07 et C10 ne
  disparaissent pas : traitement bancaire/antifraude réel et automatisation Make
  restent hors périmètre activé. Les scénarios de sécurité internes restent requis.
- [Registre des blocages](blockers.csv) et [12 P0](p0-register.csv).
- [Guide première journée](first-day-guide.md) et [frontières activées](activation-boundary.md).
- [Réutilisation de preuves](proof-reuse.json) : comparaison byte-à-byte des sources
  métier inchangées ; pas d’addition des 125 anciens tests aux nouveaux.

La journée est guidée : contexte explicite, mission/contact, documents et Brain,
conversation écrite, brouillon + approbation sans envoi, Agenda en consultation,
Journal et reprise. Make/Brevo, voix contextualisée, surveillance autonome et
synthèse globale automatique sont reportés ; le propriétaire garde la revue finale.

## Résultats et exactitude des preuves

**56 tests ciblés PASS, 0 FAIL, 0 skip** : 19 PostgreSQL/triage/présentation,
30 sécurité/autorité/transports/Make, 7 i18n. TypeScript, lint ciblé et build
Next 16.4.3 réussis. Les migrations sont inchangées ; application/réapplication
026/028 et `pg_dump`/restauration locale réellement rejoués dans ce lot.

**Deux recettes navigateur finales PASS** : journée transverse (505,9 s) et reprise après arrêt/redémarrage réel du serveur dans un nouveau navigateur. Le refus HTTP 409 sans contact sélectionné est vérifié avant la sélection explicite et la reprise. Brouillon et état approuvé persistés, aucun état SMTP accepté.

Le navigateur utilise Chromium réel, HTTPS local, Next compilé et PostgreSQL réel.
Google/OpenAI restent simulés. La Messagerie exécute le vrai handler avec injection
uniquement du transport et du query adapter PostgreSQL ; ne pas appeler cela un
test fournisseur réel ni l’ensemble du routage mail servi par Next.

Les tests incluent les refus d’authentification, les autres propriétaires/projets/
workspaces, la révocation, les conflits et approbations exactes. Le code canonique
et les contrats ne changent pas. La préparation ne touche jamais aux comptes réels.
Le login propriétaire Google réel n’a pas été exercé : les sessions de navigateur
sont issues des fixtures canoniques explicites, sans suppression des contrôles.

### Essais du harnais conservés

- Premier essai : la confirmation native d’association tardive n’était pas acceptée
  par le test ; pas d’écriture et timeout de navigation. Le test accepte explicitement
  la confirmation sans enlever celle de l’application.
- Essai suivant : journée principale PASS, reprise interrompue par HTTP 409 car le
  nouveau fil n’avait pas sélectionné le contact de la mission. Le code exact de ce
  refus est `NATIVE_EXPLICIT_CONTACT_SELECTION_REQUIRED` (pas une panne de session).
  La recette finale vérifie ce refus, sélectionne le contact puis ouvre la mission.
  Aucune réaffectation silencieuse, aucun retry transport ajouté.

## Limites qui restent réelles

- IONOS V1 b02b1dd non retrouvé : worktree/objet/branche absents, sept inventaires
  d’archives sans source identifiée. Les 117 résultats annoncés ne sont pas comptés.
  Le socle contrôlé existant est reçu séparément ; pas de réécriture des cinq boîtes.
- Make : données/scénarios/retours/reçus/idempotence métier non reçus. La page et
  les routes natives restent fermées ; Contacts OS demeure le référentiel.
- Brief global et synthèse globale ne sont pas reçus automatiquement. Le guide
  fournit la revue manuelle des preuves, sans annoncer une journée autonome.
- [Sept alertes de dépendances](dependency-risk.md), lint global historique et
  anciens HTTP 503 maintenus. Aucun P0 d’un chemin réel n’est reclassé en simple UX.
  Les alertes de parsing d’adresse interdisent notamment l’activation SMTP réelle
  sans remédiation/certification correspondante.
- Cible Vercel/Neon, rôle runtime, sauvegarde externe et restauration distante
  ne sont pas attestés. Aucune URL propriétaire nouvelle, aucun déploiement autorisé.

Une réception locale ne garantit jamais la mise en service distante. Le meilleur
candidat livré ici doit rester dans le périmètre synthétique décrit, avant toute
autorisation distincte de publication, déploiement ou recette fournisseur réelle.

## Décision et prochaines autorisations

Le GO concerne le candidat présenté dans le harnais local isolé : dialogue écrit,
mission/contact, sources documentaires, brouillon/approbation sans envoi, Agenda
en consultation et revue guidée du Journal. Il ne certifie ni une journée réelle
fournisseur ni l’accessibilité d’une URL distante au propriétaire.

Pour exposer une instance distante, il faudra une autorisation distincte et
attester son isolation, les bindings, les droits SQL et la récupération. Avant
tout fournisseur réel, traiter les alertes applicables et recevoir le parcours
sur ce code exact, sans reconstruire les connexions existantes. Make/Brevo,
voix contextualisée et synthèse globale restent hors périmètre activé J1.

Aucune autorisation de push, merge, déploiement ou envoi n’est déduite de ce GO.
