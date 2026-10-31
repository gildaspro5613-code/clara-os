# #216 — Contrat du hub Google et réconciliation IONOS

Base : 242560261f91d5f32790191d989e321dfa71d757, delivery/clara-os-v1-20261025. Les PR #176/#214/#215 sont déjà incluses ; aucun nouveau merge. Branche : fix/google-native-hub-216. Référence logicielle de correction : fdfe1136f88132733370306d99b0ae0607682288 ; les commits de preuves ultérieurs n’altèrent pas le code applicatif testé. Aucun backend, contrat API, SQL, OAuth ou connecteur modifié.

## Défaut et correction exacte

ConnectionsHub attendait connected/status/error d’un ancien contrat. GET /api/connections/google retourne {success:true,connections:[{id,status,owned,revision}],selectedConnectionId} après withNativeScope. label()/detail() voyaient connected=undefined et affichaient « indisponible », même si une connexion ACTIVE autorisée était sélectionnée. Le probe avant correctif est conservé dans evidence/before-native-contract.txt ; son source/arbre est celui du commit de base, identique à #215.

Le hub interprète désormais ce contrat natif, sans changer l’API. Une fonction de présentation locale google-native-status.ts valide sa forme et distingue : connexion sélectionnée, sélection requise, sélection devenue inaccessible, reconnexion, authentification inachevée, aucune connexion autorisée, authentification OS requise, accès refusé et état indisponible. Un refus HTTP prime sur un payload ACTIVE ; doublons/forme invalide/statut inconnu échouent fermés. Le compte explicitement sélectionné prime : aucun repli automatique sur un autre compte ACTIVE. Le paramètre de retour ?google=connected est informatif, pas une preuve de connexion : il ne produit plus un message de succès Google malgré une liste vide ou un refus natif. Les autres retours OAuth sont conservés.

« Connexion sélectionnée » n’est pas « Drive/Calendar opérationnel ». Le texte le précise, aucun badge vert connecté n’est produit pour Google sur cette seule réponse. Le lien Ouvrir Documents mène au parcours natif existant, sans OAuth, sélection ou exécution automatiques. Les cartes non Google conservent leur ancien contrat ; leurs succès/refus sont contrôlés en réception. Toutes les nouvelles chaînes existent en FR/EN/ES/DE/IT.

withNativeScope, googleAuthority, CredentialStore, les routes, ACL, scopes et nativeOperationFence restent inchangés. Propriétaire et délégation ne sont pas déduits par le navigateur : seul le résultat de l’API native gouvernée est présenté. La carte ne sonde pas automatiquement Google. L’échec Drive réel reste **NON DÉTERMINÉ** sans trace de la session authentifiée ; aucune expiration OAuth n’est conclue. Calendar n’est pas activé par ce correctif et les scopes Calendar ne sont pas ajoutés.

## Réception et non-régression

Les tests de présentation couvrent les états natifs, absence/sélection/revocation, propriétaire/délégué, priorité des refus, corps trompeurs/malformés et absence de repli. Le navigateur utilise les **vrais handlers natifs et PostgreSQL jetable** pour le propriétaire, le refus de sélectionner un compte étranger, une sélection explicite, son rechargement, une délégation, sa révocation et une session absente. Les réponses de statut restantes et les cartes Microsoft/Make sont des fixtures de présentation explicitement identifiées : aucune certification fournisseur n’est déduite de ces captures. Les cinq langues et le rendu mobile sont vérifiés.

Le premier passage a atteint les contrôles Google et les cinq langues puis échoué sur un locator Make ambigu : « Indisponible » figure à la fois dans le badge et le paragraphe existants. Le test cible désormais le badge précis ; aucune assertion applicative, permission ou durée n’est assouplie. Le journal initial est conservé. Un ajout de scénario de retour OAuth a ensuite révélé une variable de boucle hors portée dans le test (ReferenceError), corrigée sans changement applicatif supplémentaire ; la trace est également conservée.

La recette hub réutilise le même serveur, conteneur PostgreSQL et helper de fixture existants, avec une base jetable fraîche après les autres recettes. Elle ne dépend donc pas d’une session/autorité modifiée par les cas négatifs précédents. Les IDs synthétiques Google restent distincts ; aucun nouveau service de test n’est ajouté. Les statuts Microsoft/Make sont injectés à leur frontière HTTP ; aucune allowlist SQL du preload ni aucun garde serveur n’est modifié. Le marqueur « zéro chargement global » reste vérifié. Aucune requête fournisseur réelle.

Les réceptions #215 (première journée, documents/Brain, mail/approbation, reprise) restent pertinentes pour les handlers inchangés. La CI native existante exécute les tests de stores/autorité, révocations, identité, rôle SQL limité et conversations ; pas de nouveau workflow ou nouvelle infrastructure. Les résultats terminés du SHA final sont consignés dans la description de PR et ses Checks, sans attribuer au HEAD des CI historiques filtrées.

## IONOS — lecture seule

Voir [matrice des cinq boîtes](ionos/authority-matrix.csv) et [procédure administrative](ionos/readonly-reconciliation.md). Les faits Production sont les constats propriétaire du ticket ; l’instance n’a pas d’accès Neon/Vercel/fournisseur. Aucun identifiant, propriétaire ou credential IONOS historique n’est inventé. Aucune autorité, délégation ou connexion réelle n’est provisionnée. Le template antérieur reste uniquement préparé, hors migrations, sans exécution pendant #216.

Les sources historiques, limites d’accès, états attestés/inconnus, préconditions, transaction, vérifications et retour arrière sont détaillés. Le magasin/runtime refusant MAIL_PROVISIONING_DISABLED n’est pas contourné. Aucun SMTP, IMAP réel, monitoring, nouveau coffre ou mot de passe demandé dans le chat. Les paramètres de chiffrement et d’expéditeur, signatures et approbations existantes sont préservés.

## Mise en service : opérations encore nécessaires

1. Après revue et CI terminée, décision séparée de merge/déploiement de ce seul correctif. La branche est explicitement exclue des déploiements Git dans vercel.json ; protections historiques Only build production réutilisées, aucun paramètre Vercel écrit.
2. Dans la session propriétaire, relever uniquement le statut/code public **déjà retourné** par /api/documents si une trace existe. Une nouvelle lecture Google peut rafraîchir/persister un token ou invalider un statut : aucun appel n’est exécuté sous prétexte d’être purement en lecture seule. Si nécessaire, demander un GO ciblé incluant ces effets avant une nouvelle requête. Ne pas reset OAuth ni déléguer sur la seule absence d’une délégation active.
3. Selon le code réel, sélection/rattachement exact des ressources existantes sous autorisation. Aucun scope Calendar ou autre accès supplémentaire accordé automatiquement.
4. Pour IONOS, opérateur dans le canal sécurisé existant : retrouver les références, vérifier le manifeste d’UNE boîte puis faire approuver l’opération transactionnelle exacte. Les cases inconnues bloquent l’écriture. La relève de test et le brouillon/approbation sont une réception distincte ; SMTP exclu.

**GO technique** uniquement si tests locaux et CI applicable sont réellement réussis. **NO-GO pour déclarer Drive ou IONOS opérationnels** : aucune réception réelle n’est réalisée ici. Aucun merge, déploiement, écriture Neon Production, changement OAuth/secret ou Clara Live effectué. Les réserves historiques dépendances/lint global/HTTP 503 restent conservées, sans campagne générale supplémentaire.
