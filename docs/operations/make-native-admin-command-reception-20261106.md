# Make — réception de la commande administrative native (PR #249)

**Date :** 2026-11-06. **État :** qualification, NON certifié Production. Aucune mutation Production / aucun fournisseur Make appelé.

## Sources d'autorité existantes (réutiliser, pas recréer)
- `clara_native_runtime_command(digest,w,c,p,s,'read','{}')` et `clara_native_read_session` : identité issue de la session canonique. Interdire un `userId` soumis par le chat comme preuve.
- `clara_workspace_memberships` : rôle `owner/admin` non révoqué.
- `clara_registry_client_access` et `clara_registry_project_access` : approbateur `can_manage` et bénéficiaire `can_read`, tous non révoqués. Client et projet non révoqués, projet appartenant bien au client.
- `clara_connections` : `provider='make'`, `status='ACTIVE'`, workspace exact, scope `make:scenario:<key>`. Secrets exclusivement `CredentialStore`, jamais dans les logs ni dans le contrat chat.
- `clara_native_make_read_authority` : table d'essai, révision positive, `revoked_at`, périmètre complet user/workspace/client/project/scenario.

## Séquence minimale attendue de la commande native

1. Toute opération d'administration `grant` / `revoke` commence dans une session native valide, vérifie `canWrite`, rôle owner/admin et `can_manage` sur le client **et** le projet ; `revoke` ne dispense pas de l'identité authentifiée.
2. `grant` refuse sans bénéficiaire explicitement identifié, `can_read` sur client et projet, connexion active, scénario déclaré dans un registre versionné et catégorisé READ, contrat inputs/outputs valide et approbation explicite. Les scénarios WRITE/SEND ne passent jamais dans ce parcours.
3. Création/renouvellement de permission et journal d'audit dans la même transaction SQL. La clé `scenarioKey` vient du catalogue certifié, l'ID fournisseur du CredentialStore ; aucune permission par simple découverte Make.
4. `revoke` sous verrou transactionnel sur le grant : incrément de révision, `revoked_at`, événement de journal durable, atomiquement. Révoquer aussi l'accès effectif lorsque le scénario/la connexion/le périmètre n'est plus autorisé.
5. `authorize` lit l'état courant de la session + grant + connexion + scope ; le handoff relit après l'exécution et refuse toute réponse si révision/connexion/session changent. Ne pas relancer automatiquement une exécution d'issue inconnue.
6. Un catalogue extensible **par données** (clé stable, effet certifié, schéma borné des entrées/sorties, état, révision) remplace les listes fixes TypeScript/SQL, sans accorder de nouveaux privilèges. Ne pas ouvrir le `CHECK` existant tant que ce registre et son autorité de certification ne sont pas opérationnels.

## Tests de réception

| Test | Attendu | État |
|---|---|---|
| Création schéma initial sur clone Neon | Passe | PASS |
| Fixture READ accordée à périmètre avec `can_manage` et `can_read` | Accord lisible | PASS (insertion SQL de test, **pas commande native**) |
| Requêtes cross-user/client/project/scenario | Aucune ligne | PASS (prédicats SQL) |
| Révocation revision 1 → 2 | Autorisation inactive | PASS (SQL manuel) |
| Session native invalide | Aucune donnée autorisée | PASS (`clara_native_read_session` retourne NULL) |
| Commande native grant/revoke, identifiant provenant de la session | Refus/accord | NON CERTIFIÉ |
| Trigger/rôle SQL interdisant attribution directe non autorisée | Refus | NON CERTIFIÉ |
| Journal durable, atomicité/concurrence, révocation pendant appel | Refus garanti | NON CERTIFIÉ |
| Ajout d'un nouveau scénario READ par configuration sans migration/PR | Disponible seulement après certification | NON CERTIFIÉ |
| Conversation Clara → Brain → Autonomy Gate → Make → Brain | Réponse journalisée | NON CERTIFIÉ |

## Réception complémentaire du 6 novembre 2026 (clone uniquement)

- **SQL installé :** `clara_native_make_admin_command` est `SECURITY DEFINER` sur le clone `br-nameless-dew-b2v6asgj`, avec `search_path=pg_catalog,public,pg_temp`. Les rôles non fiables vérifiés ne possèdent pas `CREATE` dans `public`. La fonction n'est pas installée en Production.
- **Droits de la fonction :** `EXECUTE` pour `neondb_owner` et pour la fixture `clara_make_runtime_test`; accès `PUBLIC` révoqué. Cette fixture est `NOLOGIN/NOINHERIT` et ne représente **pas** le rôle du serveur Clara.
- **Isolation démontrée :** la fixture peut invoquer la fonction mais ne peut pas insérer/modifier directement les grants, le catalogue ou l'audit. `neon_service` conserve des droits élevés par son appartenance à des rôles Neon et ne doit pas devenir l'identité applicative.
- **Test négatif réellement exécuté :** commande `grant` avec une session invalide ⇒ `NATIVE_SCOPE_DENIED`. À la fin de cette recette : zéro grant actif, zéro audit administratif, zéro scénario activé.
- **Catalogue :** neuf scénarios enregistrés sur clone, classés 3 READ, 5 WRITE, 1 SEND, tous `enabled=false`. Les nouvelles autorisations READ exigent `effect='READ'`, certification et activation du catalogue ; cette configuration ne délivre aucune permission automatiquement.
- **Manque toujours :** rôle **LOGIN** réel du runtime recette (déterminé par `DATABASE_URL` / `POSTGRES_URL`), chaîne complète d'accès SQL pour ce rôle, connexion Make ACTIVE avec credentials autorisés, session native authentifiée réellement envoyée à l'adaptateur puis attribution/révocation contrôlées. Le raccordement au chat/Brain reste non certifié. Ne pas présenter les validations SQL sur clone comme recette positive du produit.

## Limites observées
La proposition `native-make-read-authority-proposal.sql` a bien ses FKs et contraintes de révision, mais ne prouve pas les permissions de `approved_by` ; sans commande native/trigger certifié, le rôle propriétaire peut insérer une ligne arbitraire. Elle contient toujours une liste de trois scénarios READ fixe, incompatible avec l'objectif d'extension par configuration. Les routes `/api/connections/make/{configure,verify,status}` restent bloquées par `nativeOperationFence` et la configuration héritée ne prend en charge que le webhook. **Ne pas utiliser ces routes pour contourner la session.**

**Décision : NO-GO merge / Production**, conserver le clone `br-nameless-dew-b2v6asgj` pour la suite ; aucun WRITE/SEND, aucune clé réelle ni scénario supplémentaire déclenché.
