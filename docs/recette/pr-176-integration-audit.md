# Clara OS — intégration Recette de la PR #176

Statut : **audit uniquement — NO-GO Production**.

## Référence fonctionnelle

- Source : `fix/os-operational-reception-175` (PR #176).
- Branche de travail : `chore/recette-176-integration-audit-20261018`.
- La cible de recette doit exécuter les composants métier de la PR #176 (cockpit, missions, conversations, documents, journal), pas une interface diagnostique de substitution.
- Ne pas fusionner dans `main`, ne pas modifier Clara Live, ne pas déclencher de Preview Vercel ni de déploiement Production.

## Contrôles vérifiés dans le code source

- `src/app/page.tsx` charge `MainLayout`, `Cockpit`, `resolveOperationalContext` et `loadMissions`.
- `src/app/missions/page.tsx` utilise `MissionsStage` et le magasin de missions.
- `src/app/conversations/page.tsx` utilise le contexte opérationnel et l'historique.
- `src/lib/auth/authenticated-workspace-session.ts` vérifie le hachage du jeton, une session non révoquée/non expirée et l'appartenance à l'espace.
- `src/lib/auth/canonical-request-authorization.ts` n'accepte que le cookie `clara_auth_session` et délègue les permissions au résolveur canonique.
- `src/lib/canonical/registry.ts` impose le même cookie et les attestations de périmètre ; le registre exige aussi une identité attestée pour la liste des espaces.
- `src/lib/native/authority.ts` exige les sélecteurs explicites workspace/client/projet/session et refuse les périmètres non autorisés.
- `src/components/native/NativeScopeSelector.tsx` reconstruit les sélections depuis les routes canoniques ; ne pas interpréter une liste déroulante vide comme une perte de contexte sans test serveur.

## Bloqueurs à résoudre avant toute exécution en Recette

1. Identifier précisément le commit source de la PR #176 et la version des migrations nécessaires.
2. Comparer le schéma Neon isolé aux tables, fonctions SQL, identités et autorisations attendues par cette branche, **en lecture seule**.
3. Confirmer que la session fictive existante utilise le cookie canonique attendu et que les tables d'identité/membership permettent la résolution sans fournisseur réel.
4. Vérifier le cloisonnement des services sortants (messagerie, Drive, téléphonie, Live, équipements) et le blocage effectif de leurs actions.
5. Construire les tests négatifs : jeton expiré/révoqué, absence de membership, workspace étranger, sélecteurs incomplets, écriture interdite et fournisseur externe bloqué.
6. Exécuter les tests de non-régression, puis décider explicitement si un déploiement **uniquement dans le projet Vercel Recette** est autorisable.

## Critères de réception

Parcours fictif dans **l'interface cible** : ouverture cockpit → création/sélection mission → conversation Clara simulée → document fictif → journal durable → retour cockpit. Aucune action fournisseur réelle, aucune contamination inter-espace, aucun accès Production/Live.

**Aucun GO déploiement, aucune validation fonctionnelle complète tant que les points ci-dessus ne sont pas prouvés.**

## Attestation structurelle Neon — 18/10/2026

Branche inspectée en lecture seule : `br-crimson-feather-b2zr00sf` du projet Recette isolé.

- Confirmé par l'inventaire du schéma : `clara_auth_sessions`, `clara_auth_identities`, `clara_native_conversation_messages`, `clara_native_journal_scope`, `clara_native_resource_authority`, `clara_registry_clients`, `clara_registry_client_access`.
- Confirmé par l'inventaire ou la liste des routines : `clara_native_read_session`, `clara_native_runtime_command`, `clara_native_chat_command`, `clara_native_history`, `clara_registry_command`, `clara_registry_pending`.
- Une session fictive active a été observée au moment du contrôle, expirant à `2026-10-18T12:00:43Z`. Ce constat ne vaut pas garantie de validité lors du déploiement futur.
- Les lectures complémentaires des appartenances et identités ont été refusées par les contrôles de sécurité de l'outil ; aucune tentative de contournement n'a été faite.

**Conclusion :** compatibilité de présence, pas attestation des données, des permissions ni de la conformité de migration. Aucun GO déploiement.
