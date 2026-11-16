# Validation — périmètre et preuves

Base applicative : 56ac97fa8fe9d3225fef3c1fb036b256f13923b5. Corrections applicatives : 42d9048, d3b2cf3 puis 9929b4e (icône navigateur officielle). e25f3fd qualifie le harnais visuel et l’origine du handler mail. Le commit documentaire final préserve ces commits. Aucun backend, store, contrat ou migration modifié.

## Contrôles locaux

- `npm run build` : PASS, Next.js 16.4.3, compilation optimisée et typage. Le premier lien node_modules externe n’était pas accepté par Turbopack ; utilisation ensuite d’un arbre local des mêmes dépendances, sans changement de package.json/lockfile.
- `node node_modules/typescript/bin/tsc --noEmit` : PASS.
- `npx eslint` sur les deux composants natifs et les trois recettes navigateur impactées : PASS.
- `CANONICAL_TEST_CONTAINER=clara-canonical-test-postgres node --import tsx --test src/tests/operational-recovery-postgres.test.ts src/tests/operational-recovery.test.ts` : **15 PASS, 0 SKIP**. Vrai PostgreSQL jetable, consultations/commandes, historique, refus, révocation, cache mail sans IMAP/SMTP et réapplication locale de 030 préservant les ACL/wrappers. Lancement préalable sans CANONICAL_TEST_CONTAINER : 3 PASS et 1 SKIP, non compté comme preuve SQL ; corrigé par l’exécution explicite ci-dessus.
- `git diff --check` : PASS ; aucune réécriture de l’historique.
- SVG officiel : identité SHA-256 avec le blob du commit 7f6ef76, réponse HTTP locale identique, image chargée dans les menus desktop/mobile.

## Recettes navigateur

Les résultats définitifs et captures sont conservés dans evidence. Serveur Next réellement compilé/démarré, HTTPS local, PostgreSQL jetable, identités synthétiques. Les providers sont simulés et les sorties réseau non autorisées bloquées. Chaque capture démontre son écran et son état de fixture, pas une certification fournisseur réelle.

- operational-delivery-browser : navigation authentifiée des 12 pages, logo exact, section avancée repliée puis ouverte, erreur hostile filtrée, FR/EN/ES/DE/IT, menu et navigation mobile. Les noms client/projet doivent correspondre au registre autorisé. Les captures sont prises après chargement du contexte et, pour le menu, après sa transition CSS, sans sleep/retry ajouté au runtime.
- operational-recovery-browser : consultations sans mission, historique, création explicite, absence de mutation d’une mission existante, code Drive précis, refresh puis vrai arrêt/redémarrage du serveur et reprise.
- native-documents-browser : OAuth simulé avec state/nonce, sélection explicite, rattachement/version, analyse/Brain/Journal/Cockpit et révocations. Seule l’ouverture de la section avancée est ajoutée ; assertions de sécurité inchangées.
- native-document-continuity-browser : fiche synthétique, extraction/provenance, contradictions, connaissances Brain, deux missions, isolement, opérations/reçus ; aucun fournisseur réel. L’extension optionnelle V1_FIRST_DAY (brouillon signé/approbation) est qualifiée séparément dans le journal de continuité et reprise ; les composants mail et signatures applicatifs sont inchangés.

Les deux premières recettes ont passé avant le dernier raffinement de synchronisation des captures. Une reconstruction lancée pendant la reprise de cette tentative a invalidé son serveur local : cette tentative n’est pas revendiquée comme preuve finale de redémarrage. L’exécution finale utilise un build figé, sans rebuild en cours. Les erreurs d’environnement restent distinctes de la réserve HTTP 503 historique, qui n’est pas levée.

## CI et limites

Le workflow Native resource authority validation existant est étendu aux captures/logo/i18n et au nouveau navigateur ; aucun workflow de déploiement ajouté ou exécuté. Les résultats GitHub du HEAD publié font autorité dans les Checks de la PR ; leur lien et leur conclusion seront repris dans sa description après terminaison. Un workflow seulement démarré n’est pas déclaré réussi. Les autres workflows peuvent être filtrés par leurs chemins : ne pas substituer un ancien succès à un résultat du HEAD.

Les 137 preuves historiques restent dans la chaîne Git. Les anciens résultats #214 (15 ciblés, 62 natifs/sécurité, 18 P0/commerciaux et réceptions) ne sont pas additionnés aux résultats de cette campagne. Le lint global historique et les alertes de dépendances ne sont pas masqués ; aucun changement de dépendance justifiant une nouvelle campagne générale.

### Interaction du harnais reproduite et conservée

La première exécution commune échoue à la dernière assertion native-documents : `GLOBAL_LOADER_ATTEMPT`, attendue vide. La visite visuelle de Connexions avait appelé `/api/connections/microsoft`, dont l’authentification legacy utilise `SELECT user_id FROM clara_auth_sessions` puis les memberships, en dehors de l’allowlist SQL du preload natif. Le garde de fixture a refusé cette lecture ; cette trace partagée a ensuite fait échouer la recette documentaire. Aucun accès fournisseur, aucune permission élargie, aucun succès simulé déclaré réel.

Pour la seule recette **visuelle**, le statut Microsoft est désormais représenté explicitement par un 403 AUTH_REQUIRED. Ce n’est pas un test du backend Microsoft. L’allowlist et les assertions documentaires restent inchangées ; la nouvelle recette vérifie elle-même que le marqueur de chargement global est vide. Reprise sur une **nouvelle base jetable**, sans effacer un marqueur pour sauver le test. Le journal de l’échec est conservé dans evidence/attempt-shared-marker.log. Les vraies lectures natives PostgreSQL, l’OAuth Google simulé et les refus documentaires restent exécutés dans les recettes concernées.

La continuité documentaire utilise un dossier de sortie explicitement désigné sous /workspace. Le premier lancement sans cette configuration a été arrêté avant qualification ; il n’est pas interprété comme un échec applicatif. La campagne finale active V1_FIRST_DAY dans une base jetable neuve et utilise les recettes existantes de première journée et de reprise documentaire après arrêt serveur, sans en réécrire les assertions. Les cookies de fixture produits par ces recettes restent hors Git.

### Refus mail de la recette étendue

La première journée optionnelle a reproduit un timeout en attendant le message après Synchroniser. Le handler mail réel était injecté à la frontière fournisseur dans **le processus du test** ; CLARA_AUTH_APP_ORIGIN n’y était pas configuré, contrairement au processus serveur Next. `sameOrigin()` utilise cette origine de confiance explicitement configurée, pas l’URL seule. La vérification ciblée démontre le refus sans origine attendue, l’acceptation de l’origine locale exacte et le refus d’une origine étrangère.

Correction **test uniquement**, dans helpers/first-day-browser.ts : vérifier que l’origine existante n’est pas contradictoire, définir l’origine locale déjà validée (127.0.0.1, base native_browser_*), puis restaurer l’environnement au teardown. Aucun garde applicatif n’est désactivé, aucun timeout augmenté, aucun retry ajouté. Les éventuels refus HTTP sont désormais journalisés par méthode/statut/code public uniquement, sans corps ou en-têtes. L’échec initial est conservé ; aucune panne IONOS réelle n’en est déduite.

## Résultats finaux de continuité

PASS : première journée avec vrai handler mail et vrais stores SQL, Agenda/transport mail simulés, brouillon signé puis approbation durable au Cockpit et Journal ; **0 tentative SMTP et 0 écriture Google**. PASS : après arrêt/redémarrage Next, mêmes références, même historique, même mission, reçu rejoué sans nouvel événement documentaire ; une nouvelle conversation explicitement sélectionnée retrouve les sources sans transfert silencieux d’historique. Voir first-day-result.json, document-result.json, document-restart-result.json et continuity-and-restart.log. Les ~9 minutes du harnais local incluent les processus psql/Docker et ne préjugent pas de la latence Production.

Le build final intègre src/app/icon.svg identique au SVG public et retire l’ancien favicon Vercel. La recette visuelle finale vérifie la réponse de l’icône et sa métadonnée sur les douze pages ; les captures finales sont liées aux blobs applicatifs via capture-provenance.json. Le changement final d’icône n’affecte ni les handlers, ni les magasins, ni les contrats qualifiés par la première journée.

Les captures documents.png et cockpit-after-restart.png proviennent du build applicatif d3b2cf3 utilisé pour la journée/reprise ; les quinze captures de navigation/diagnostic sont régénérées sur 9929b4e avec le nouveau favicon. Le delta applicatif entre ces builds se limite au favicon ; la provenance distingue ces deux groupes au lieu de présenter des images historiques comme une réception du dernier déploiement.

## Synthèse locale avant publication

**22 tests ciblés PASS** : 15 PostgreSQL/consultations/autorités, 7 i18n. Contrat d’origine vérifié séparément (sans origine ou étrangère : refus ; origine locale exacte : acceptée). **6 recettes navigateur PASS** : livraison visuelle finale, consultation/création/reload, documentaire natif, continuité documentaire + première journée, reprise consultation après arrêt, reprise documentaire après arrêt. Les reprises et les parcours exécutés plusieurs fois pendant le diagnostic ne sont pas additionnés. Build final, TypeScript et lint ciblé : PASS. 17 captures synthétiques conservées, dont 15 du build final et 2 de la recette métier avant le seul changement du favicon. Aucun secret/cookie/credential ou effet fournisseur réel publié. Les fins de ligne des nouveaux journaux sont normalisées sans modifier leurs résultats.

La publication doit conserver une PR Draft vers delivery/clara-os-v1-20261025. Les Checks du SHA distant et la description de PR recevront les résultats CI effectivement terminés ; aucun statut futur n’est anticipé dans ces preuves locales.
