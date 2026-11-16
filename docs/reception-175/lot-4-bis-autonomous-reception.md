# Lot 4 bis — corrections de réception autonome

**GO pour une nouvelle réception autonome en isolation**, sous réserve des contrôles finaux du SHA de la PR. **NO-GO Production** : fournisseurs, configuration et autorisations réelles restent à certifier séparément. PR #176 Draft, branche `fix/os-operational-reception-175`, base `consolidation/clara-os-clean-base`. Référence avant correction : `b30d20a212f6e44eb585d17db5771fa066f8874b`.

Les preuves avant/après et les commandes sont dans `lot-4-bis-evidence.json`. Les contrôles du dernier SHA sont liés dans la PR ; ne pas confondre un reçu de traitement terminé avec une réussite métier.

## Trois reproductions et corrections

| P1 | Avant, au SHA de référence | Après correction |
| --- | --- | --- |
| L4-01, fil A → B | Mission B active, conversation et dashboard Brain de A encore présents | Fil lié immuablement à sa Mission au commit autorisé. Créer/sélectionner une autre Mission dans ce fil est refusé, sans création résiduelle ni réattribution d'historique. Un autre fil doit être choisi explicitement. |
| L4-02, acquittement perdu | Répéter le même POST produit deux tours utilisateur distincts | `operationId` stable, empreinte du contenu normalisé et de l'identité/contexte canoniques ; réservation dans le registre d'opérations existant. Même opération → même reçu, contenu/contexte différent → 409. Résultat et écritures métier committent dans la même transaction PostgreSQL. |
| L4-03, limite 100 | Un nouveau tour retire les deux premiers messages de la Session persistée | Les anciens et nouveaux messages sont archivés avant remplacement de la fenêtre active, dans le même commit. La Session garde un cache de 100 messages ; l'historique durable reste accessible par pages bornées. |

Les reproductions initiales ont été rejouées sur l'application compilée du SHA de référence et une base jetable pré-017. Les premiers tests additionnels ont aussi détecté des erreurs de fixture (principal B et attestation immutable) et une ambiguïté de variable SQL : corrigées sans désactiver d'assertion ni de barrière. Les mocks de frontière des tests de traduction/autorité ont été raccordés au nouveau wrapper ; les tests réels PostgreSQL et HTTP vérifient indépendamment ses droits.

## Architecture existante réutilisée

- Identités, memberships, ACL client/projet, `clara_native_resource_authority` et son contrôle de snapshot ; aucun rapprochement par nom/email/dernière Mission.
- `clara_sessions`, `clara_missions`, `clara_journal_entries`, Journal/Cockpit, sélection et conversation existantes.
- Registre `clara_external_event_jobs` : ajout du type `native-chat` ; clé d'opération dérivée de l'acteur canonique et de son identifiant d'opération. L'empreinte comprend workspace/client/projet/fil et contenu normalisé. Le changement de jeton d'authentification pour la même identité n'impose pas une nouvelle opération.
- Extension du store Session par `clara_native_conversation_messages`, pas un nouveau Core/Brain/Journal ou moteur de conversation. Chaque message conserve son ID et son contenu ; une tentative de réécriture du même ID est refusée.
- Le worker d'événements entrants exclut uniquement le namespace natif réservé, sans dépendance au nouveau champ SQL pour ses anciens appels. Les contrats Unified Core/archives et Clara Live ne sont pas modifiés.

## Autorité du fil et historiques existants

Le serveur inscrit `nativeMissionId` au commit de la première association dans un contexte vide et autorisé. La liaison ne peut ensuite être remplacée ni effacée. Le SQL revalide cette règle à l'enregistrement, y compris après un cycle asynchrone ; une simple vérification UI ne suffit pas.

**Pas de backfill des anciens fils.** Un fil historique sans attestation du lien Mission/conversation reste consultable sous ses droits actuels, mais ne devient pas un contexte cognitif actif. Les vues dérivées Brain/sources/recommandation sont neutralisées et l'état projeté est arrêté ; les messages, la Mission persistée et l'historique original ne sont pas réécrits. L'interface indique la lecture seule et propose de créer un nouveau fil. La sélection explicite d'une Mission autorisée dans un nouveau fil vide ne copie pas l'ancien historique.

Des historiques déjà tronqués avant ce correctif ne peuvent pas être recréés par le code : une éventuelle récupération depuis sauvegarde exige une revue distincte. Les données historiquement mélangées ne sont pas automatiquement réattribuées ou déclarées réparées.

## Idempotence, concurrence et reprise

Le POST `/api/clara/chat` exige désormais un `operationId` opaque stable (16–80 caractères autorisés). Le client natif l'émet et le conserve pour la reprise du même tour ; `sessionId` vérifie que le fil affiché correspond toujours au contexte sélectionné. Les anciens clients bruts sans identifiant reçoivent un refus explicite, sans exécution. Les API d'événements externes restent inchangées.

1. Autorité actuelle vérifiée, réservation SQL committée avant cognition.
2. Un seul propriétaire admis par opération et par fil ; une autre requête retrouve l'état ou attend, sans deuxième cycle.
3. Au résultat, autorité revalidée puis CAS, Mission/Session/Journal, messages durables et reçu enregistrés dans la même transaction. Le reçu conserve les références des entrées Journal committées.
4. Après perte d'acquittement SQL/HTTP, le même POST restitue le reçu ; pas de nouvelle composition, entrée Journal ou tour. Une erreur de génération reste une erreur, même si son reçu est durable.
5. Le navigateur consulte l'historique actuel après réponse, afin qu'un reçu ancien ne remplace pas la vue par un snapshot périmé. Les entrées précédentes restent accessibles par pagination.

Le propriétaire d'un traitement interrompu n'est jamais volé après un délai ou un redémarrage. Le bouton **Vérifier la réponse** reprend la même opération ; aucune répétition automatique n'est ajoutée.

Un abandon explicite avec confirmation est disponible via DELETE sur le même endpoint. Il inscrit une barrière durable, sous le même verrou que le commit. Si l'abandon gagne, un propriétaire tardif ne peut plus persister ; si le commit a déjà gagné, son reçu n'est pas écrasé. Le test exerce aussi une vraie course PostgreSQL entre les deux. **Cela ne prétend pas annuler un appel fournisseur engagé ou ses coûts.** Une nouvelle demande après abandon est une décision utilisateur explicite ; aucun renvoi automatique ni action externe incertaine réexécutée.

Le cache de reprise du navigateur est temporaire par fil et n'est pas une autorité. Les droits sont revérifiés côté serveur. Les reçus persistent dans PostgreSQL et se récupèrent dans un processus indépendant. Si le navigateur a perdu cet état local, l'historique committé reste consultable ; un traitement actif bloque une nouvelle réservation et permet de retrouver sa demande avant vérification/abandon.

## Historique durable, pagination et performances

- Archive append-only fonctionnelle : unicité `(session_id,message_id)` et ordre propre au fil ; mêmes ID/contenu réutilisés, modification refusée. Pas de purge automatique introduite.
- Cache Session limité à 100 messages après commit ; les fenêtres de raisonnement/composition déjà bornées restent inchangées. L'archive entière n'est pas envoyée au Brain.
- GET `/api/clara/conversation` : autorité native, fil attendu, limite 1–100, curseur stable par message ; accès privés revérifiés à chaque page.
- Lectures SQL bornées autour de l'index du fil et du curseur, sans chargement de toute l'archive pour une page. Aucune promesse de performance Production à volume illimité ; la charge réelle reste à mesurer.
- Bouton de messages précédents sur Conversations et Clara/Cockpit ; FR/EN/ES/DE/IT conservés. Un changement de fil remonte les composants avec une clé propre au fil.
- Les reçus natifs ne sont pas expirés/purgés par le worker des événements entrants. Une politique de suppression ultérieure devra être explicite et conserver les protections contre le rejeu ; aucune durée de conservation nouvelle n'est imposée silencieusement.

## Migration 017 — opérations administratives futures uniquement

`db/migrations/017_native_conversation_continuity.sql` dépend du registre d'opérations 007 et du runtime natif 014. Les migrations 012–016 existantes ne sont pas réécrites. Elle ajoute une table de messages, un discriminant de job et les fonctions d'autorité/commit/historique ; elle conserve les Sessions/Missions/Journal existants.

Aucune attribution historique automatique, suppression, DDL au démarrage ou migration Production. Les nouveaux chemins vérifient la version du runtime ; une migration manquante ferme les écritures concernées, sans repli global. Une recette remplace temporairement le runtime par sa définition précédente dans une base jetable et vérifie le refus avant logique métier.

Avant toute opération réelle : sauvegarde complète et restauration vérifiée, revue des dépendances 007/012–016, permissions du rôle applicatif et verrouillage DDL. Les nouvelles fonctions restent `SECURITY INVOKER`, accès PUBLIC révoqué. Revoir explicitement EXECUTE des fonctions et SELECT/INSERT sur la table de messages, plus les droits nécessaires sur le registre d'opérations ; ne pas déduire les droits Production du superutilisateur des fixtures.

Les tests réappliquent 017 et restaurent une sauvegarde locale, puis vérifient reçus, messages et droits. Aucune instruction de migration Production n'est exécutée par la CI/app.

### Retour arrière non destructif

Fermer les nouvelles admissions de chat concernées avant retour de code ; conserver les nouvelles tables, données et barrières. Ne pas supprimer les reçus/message IDs ou remettre un traitement ambigu à zéro. Garder le filtrage compatible du namespace natif dans l'ancien worker, ou arrêter ce worker jusqu'à qualification : un retour aveugle à son ancienne maintenance pourrait expirer ces reçus. Ne jamais remplacer le garde-fou SQL par une ancienne fonction en Production pour rouvrir une écriture. Qualifier le rollback en isolation avant toute autorisation réelle.

## Recettes et limites

Les tests permanents couvrent changement Mission/client, faux accès, historique non attribué, réserve concurrente, conflit de contenu, perte d'acquittement HTTP et SQL, reprise dans un processus indépendant, reconnexion canonique, révocation au commit, échec de génération, abandon/course et plus de 100 messages, rafraîchissement et pagination.

La recette Chromium utilise l'application optimisée, les handlers et PostgreSQL réels, des identités synthétiques et des fournisseurs simulés. Elle coupe l'acquittement après le vrai commit, recharge la page et vérifie un seul tour et un Journal inchangé. Les recettes commerciales/documentaires/IONOS et les cinq langues restent exécutées. Les accès réseau Live/fournisseurs réels sont bloqués dans la fixture ; pas de commande physique ou d'envoi réel.

Les échecs globaux lint/Vitest sont comparés séparément au SHA de départ ; aucun test désactivé. Les fournisseurs réels, secrets/configuration, droits Production, ergonomie métier réelle et volumétrie réelle restent à certifier. La conservation des droits Drive et des autorités des boîtes mail reste portée par leurs services existants ; l'archive de conversation ne déchiffre ni ne contourne leurs analyses privées.

Le GO de ce lot autorise une **nouvelle réception isolée**, pas une réception Production ni une ouverture des capacités Live. Clara Live et la PR #303 restent inchangées. PR #176 Draft ; aucun merge ni déploiement.
