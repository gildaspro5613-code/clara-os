# Levée ciblée des obstacles de recette — 25 octobre 2026

## Résultat et provenance

Bases inchangées : OS #209 `4cb5f2e226eb118ba772a68671590fd7c8d1cd82` (8 SUCCESS), Live #335 `121769193bb8df72a63e5bc4ec4732a7557d82a7` (11 SUCCESS). Corrections sur deux branches dépendantes, sans merge, déploiement ou modification distante. Les cinq domaines Live, notamment Structure/Rigging, sont conservés. Les calculs Structure ne constituent pas une certification de sécurité.

| Obstacle | Résultat concret | Limite restante |
|---|---|---|
| OS source de précontrôle | Le checkout et les vérifications du workflow manuel ciblent exactement OS #209. Le jeton dédié, le projet, l'équipe et le custom Environment restent inchangés. | Les trois verrous d'écriture restent actifs. Le transport historique, séparément épinglé sur son ancien artefact sans cron, reste inaccessible ; ne jamais l'activer pour #209 sans sa revue spécifique. |
| Live API optimisée | Mode explicite `REACT_APP_RUNTIME_MODE=recette` et origine `REACT_APP_RECETTE_API_ORIGIN`, validés avant compilation et dans le client API existant. Configuration manquante, URL HTTP/avec identifiants/chemin/query/fragment, Production connue ou conflit avec l'ancien override : refus. | Une URL syntaxiquement admise ne prouve pas son rattachement à une API/Mongo isolée. Attestation externe nécessaire avant déploiement. |
| Pont cognitif | Contrats, authentification produit, scopes, reçus, révocations et refus Recette conservés. Aucun nouveau canal ni faux reçu. | Destination Live isolée et preuve de ses bindings absentes : impossible de limiter une exception aux deux déploiements identifiés tant que l'un d'eux n'est pas identifié. Le pont reste fermé, pas un PASS. |

## Matrice des destinations et permissions

| Élément | Production préservée | Recette autorisée / statut réel |
|---|---|---|
| OS Vercel | Aucun changement du projet principal ni de sa branche Production | Projet `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`, équipe `team_0BeqOAO8t5oDEBdzHHdekcxv`, environnement `env_T6nc8Pd4KLG9qTbvTM9ZsOn4T4YM` / slug `clara-os-recette` : références historiques ; binding effectif NON ATTESTÉ |
| OS PostgreSQL | Aucune connexion ou écriture Production | Neon `fragrant-dream-31652403`, branche `br-crimson-feather-b2zr00sf`, `neondb`, `clara_os_recette_limited`. Le garde SQL existant refuse mauvaise identité, hôte hors liste, mode divergent, rôle/base divergents et tout POSTGRES_URL. Aucun GRANT exécuté. |
| Frontend Live | Build optimisé sans marqueur Recette : API canonique `https://clara-live-api.vercel.app`, ancien override toujours ignoré | Build explicitement Recette : origine HTTPS distincte obligatoire, aucun repli Production. Projet/environnement distants NON IDENTIFIÉS ici. |
| API et MongoDB Live | Aucune modification et aucune connexion | Projet API, deployment ID, SHA, MONGO_URL, DB_NAME, stockage documentaire et identité SQL/Mongo effective NON ATTESTÉS ; aucune base créée. |
| OS ↔ Live | Transport et contrats existants inchangés | canonical.live et external-product.callback restent refusés en Recette avant transport. Produit/workspace/utilisateur/session doivent rester authentifiés par les circuits existants. |
| Fournisseurs et matériel | Aucun changement | Google métier, OpenAI, IONOS, Make/Brevo, Twilio/ElevenLabs et commandes matérielles restent interdits. |

## Écritures fictives strictement nécessaires

`REST_WRITES_DISABLED` est un verrou du **déploiement REST Vercel**, pas une interdiction générale de persister les missions. Aucun déverrouillage SQL global n'est nécessaire. Après attestation de la cible, les seules écritures de recette métier passent par les APIs et fonctions canoniques existantes : sessions/appartenances fictives préautorisées, missions et associations de contacts, conversations/messages et reçus, références/extractions documentaires, Journal, brouillons et approbations contrôlées. Pas d'envoi, synchronisation fournisseur, modification de credential, DDL applicatif ou migration distante dans ce lot. Les données réelles ou historiques ne doivent pas être réattribuées.

Rôle applicatif : CONNECT/USAGE, DML et verrous de lignes requis sur les objets réellement utilisés, EXECUTE sur les commandes natives et leurs dépendances. Vérifier les catalogues et les propriétaires avant tout changement de droits ; aucun GRANT global, CREATE, SUPERUSER, BYPASSRLS ou rôle propriétaire. Le rôle de migration reste distinct. Réutiliser la revue ordonnée des migrations, notamment 025/026 et les deux 028 distinctes ; ne pas supposer qu'une migration Git est appliquée à distance.

## Attestations extérieures exhaustives encore manquantes

1. OS : état actuel du projet/custom Environment, deployment ID et source exécutée, valeurs **effectives** des bindings DATABASE_URL, CLARA_RECETTE_NEON_HOST/BRANCH_ID/MODE, absence de POSTGRES_URL/override Production, base/rôle/permissions, migrations présentes et absence de tâches planifiées indésirables. Présence d'un secret GitHub homonyme insuffisante. L'Environment GitHub existe ; la lecture des noms de secrets retourne 403 ici, ce qui ne démontre pas leur absence.
2. Live : IDs et noms des projets/environnements existants frontend/API isolés, origine HTTPS exacte de l'API, SHA exécuté, liaison Git/branche sans automatisme indésirable, destination et rôle MongoDB non Production, stockage documentaire, permissions et état des données fictives. Aucun de ces IDs ne doit être inventé. L'URL de recette frontend n'est pas une preuve sur MongoDB.
3. Bilatéral : OS et Live destinations exactes, deux identités de déploiement et bindings attestés, configuration serveur des produits et correspondance explicite des workspaces ; preuve que les credentials et callbacks ne pointent pas vers Production. Ensuite seulement préparer l'exception minimale dans le garde existant pour ces destinations/capacités, avec refus des autres origines, expiration/révocation et tests bilatéraux. Ne pas accepter un drapeau seul comme preuve ; ne pas réutiliser un droit read/archive ou autoriser le fournisseur cognitif réel.
4. Récupération : rétention, point récupérable, opérateur/droits, destination isolée et RPO/RTO des deux bases et du stockage ; conservation des clés, approbations, reçus et historiques. Les restaurations locales historiques sont réutilisées, mais ne prouvent pas une restauration distante actuelle. Une branche Neon conservée n'est pas un export externe restauré.

## Protocole volontaire, aucune exécution autorisée ici

1. Examiner ces branches par rapport aux bases #209/#335. La correction Live change nécessairement son futur SHA applicatif ; ne pas la présenter comme déjà incluse dans 1217691. OS applicatif reste exactement 4cb5f2e ; seule sa chaîne de contrôle change.
2. Depuis le contexte opérateur déjà autorisé disposant des bindings effectifs et des clés de métadonnées hors runtime public, exécuter : `node --import tsx src/scripts/attest-recette-runtime.mts --source-sha=4cb5f2e226eb118ba772a68671590fd7c8d1cd82`. Ce contrôle lit les métadonnées Vercel/Neon et utilise une transaction SQL readOnly. PASS exige toutes les preuves ; FAIL ou NON ATTESTÉ bloque la suite. Ne jamais copier les secrets dans les arguments, les logs, GitHub ou la conversation. Ne pas injecter de clés de contrôle dans le runtime pour contourner l'accès manquant.
3. Dans le contexte API Live autorisé, relever uniquement le verdict de correspondance projet/environnement/SHA et de binding MongoDB/stockage, via les mécanismes d'autorisation existants. Ne pas exporter la chaîne de connexion. Aucun contexte utilisable n'est fourni ici : étape NON EXÉCUTÉE.
4. Revoir le transport manuel OS : le candidat conserve deux crons Production. Aucune suppression ne doit être propagée à Production ; aucun transport ne doit les activer silencieusement en Recette. Tant que le mécanisme sûr sur ce SHA n'est pas approuvé, conserver REST_WRITES_DISABLED et verify_only=true. Les contrôles équipe/projet/custom Environment/source restent obligatoires. Aucun fallback ni répétition automatique d'un POST après résultat incertain.
5. Autoriser séparément le déploiement sur les cibles attestées et la seule exception bilatérale testée. Puis exécuter le protocole existant deployed-reception-plan.md : OS mission → projet Live autorisé → contexte/association → retour OS → rafraîchissement → mêmes reçus et contexte ; seconde mission/workspace refusés, révocation et perte d'acquittement sans doublon. Aucun fournisseur réel.
6. En cas de panne : arrêter seulement les traitements de recette, conserver les reçus/états incertains et revenir à un déploiement isolé compatible avec le schéma additif. Ne pas supprimer les migrations ou restaurer une ancienne base après des effets externes sans réconciliation et autorisation.

## Preuves exécutées

- OS : 26 tests du transport historique et du nouveau précontrôle PASS ; 35 tests des gardes, Google sign-in, attestation simulée et callback borné PASS ; TypeScript PASS, build Next.js PASS, lint ciblé des scripts PASS.
- Live : 41 tests PASS, quatre suites (destination, vrai client API/intercepteur, lazy route, préparation interop et catégories incluant Structure) ; builds optimisés Production et Recette PASS. Chromium sur le build Recette : auth/me et auth/google/config visent exclusivement l'origine fictive attendue ; aucun transport externe, assets distants neutralisés. Il s'agit d'une preuve de routage, pas d'authentification métier réelle. Lint ciblé via l'ESLint existant de react-scripts PASS ; le lancement direct de l'ESLint racine échoue faute de configuration autonome, sans modification générale du lint.
- Le premier lancement Jest interop sans l'alias @ a échoué ; rejoué avec le mapping déjà utilisé en CI, les quatre suites passent. Le test historique du workflow comparait le checkout courant à l'ancien artefact : distinction corrigée entre source du précontrôle et transport historique, avec préservation exacte du vercel.json du candidat et des deux crons d'origine.
- Les preuves antérieures de PostgreSQL/MongoDB, persistance et contrats bilatéraux sont conservées dans validation.md. Aucune nouvelle réception HTTP distante, attestation réelle, requête métier fournisseur ou migration distante n'est prétendue.

**Décision : GO pour revue des corrections locales et précontrôle manuel strictement en lecture seule. NO-GO pour déploiement intégré à ce stade : destinations/bindings Live et attestation effective manquent ; le pont reste volontairement fermé. Production : NO-GO.**
