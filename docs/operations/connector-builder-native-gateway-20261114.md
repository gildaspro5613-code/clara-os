# Clara OS — Connector Builder : raccordement natif transversal

**Date :** 14 novembre 2026  
**Branche isolée :** `fix/connector-builder-native-gateway-20261114` (base `delivery/clara-os-v1-20261025`).  
**Statut :** candidat technique non réceptionné, non fusionné, non déployé.  
**Objectif :** un socle commun, pas une connexion spécifique par client ou un nouveau moteur parallèle.

## Fondations réutilisées

- `ConnectorDefinition`, `ConnectorEngine`, `CapabilityRegistry`, `ConnectionResolver`, `CredentialStore`, adaptateurs GitHub/Brevo/Make/Stripe existants.
- Session canonique `clara_native_runtime_command`, droits workspace/client/projet, révisions de grants, chiffrement AES-256-GCM du coffre existant.
- Interdictions Recette, validation humaine WRITE/SEND et journalisation natives maintenues.

## Nouveau chemin (READ uniquement)

1. **Découverte :** `connector-builder-directory.ts` lit les manifestes des fournisseurs approuvés et les intersecte avec `CapabilityRegistry`. Un manifeste ne vaut **ni autorisation ni certification**.
2. **Règle transversale :** `native-connector-read-gateway.ts` exige une session native, une capacité READ déclarée, des entrées bornées, un grant exact utilisateur/workspace/client/projet, l'audit avant exécution et la revalidation du grant après réponse. Pas d'appel fournisseur quand il manque une permission.
3. **Accès fournisseur :** `native-connector-builder-runtime.ts` résout les droits et l'enveloppe chiffrée via le seul SQL natif ; les adaptateurs fournisseurs déjà présents exécutent la lecture. Aucune clé ni URL de fournisseur issue du chat.
4. **Admin interne :** `native-connector-builder-admin.ts` autorise une demande explicite de `grant/revoke` en contexte natif écrivable. Ne pas exposer directement ce chemin au modèle ni au navigateur sans une confirmation durable.
5. **SQL générique :** `connector-builder-common-{native,admin,audit}-clone.sql` fournit un catalogue READ révisé, des grants révocables, une lecture de coffre scindée `authorize/credentials` et un journal transactionnel.

## Qualification réelle sur le clone

Les scripts SQL génériques ont été installés sur le clone Neon **non primaire** `br-nameless-dew-b2v6asgj`, limité au rôle `clara_make_runtime_login` et à `melodie-digital` pendant la qualification.

**Contrôles négatifs exécutés avec le rôle limité :** fausse session → `NATIVE_SCOPE_DENIED` sur autorisation et coffre ; fausse approbation → refus. `PUBLIC` n'a pas EXECUTE sur le résolveur ; runtime sans SELECT direct sur les grants. Le catalogue générique comporte 0 entrée, 0 grant, 0 événement d'audit. Make reste `CONFIGURED`, sans exécution supplémentaire ni activation.

Tests TypeScript disponibles : `src/tests/connector-builder-native-gateway.test.ts` (déclarations, périmètre, READ, audit, révocation, faux résultat, entrée malveillante), mais **non exécutés en CI ou en session locale**. Ne pas marquer PASS sans exécution effective.

## Limitations explicites (à lever avant de dire « Builder terminé »)

- La migration SQL test est volontairement **clone-only** (nom du rôle, base et workspace exacts). Un schéma et des ACL multi-tenant validés pour le rôle Production restent à préparer ; ne pas copier ce SQL tel quel en Production.
- La nouvelle passerelle générique n'est **pas encore appelée par le chat natif** : il faut la raccorder au registre de capacités accessibles par Clara sous sa session réelle, avec sélection du bon connecteur et consentement.
- Make expose actuellement `make.scenario.execute` (catégorie EXECUTE), pas une capacité native READ déclarée dans le registre central. Son scénario `find-drive-document` ne doit pas être reclassé READ sans contrôle du catalogue fournisseur et du contrat. Le coffre dédié à Make sur clone utilise une clé distincte : prévoir la normalisation de l'autorité et du chiffrement sans copier le secret.
- Stripe possède des définitions d'adaptateur mais ses READ ne sont pas toutes déclarées au `CapabilityRegistry`. Le Builder ne publie donc pas automatiquement ces opérations.
- Les parcours de connexion OAuth/API, le choix des permissions et le statut de certification pour **un client distinct** restent à finaliser. Un fournisseur nouveau peut exiger une intégration **une fois par fournisseur**, mais pas une nouvelle migration/clonage par client.
- Aucune réception positive `granted session → live READ → revoke → denied` n'est attestée, et **aucune livraison Production** n'a été autorisée.

## Stratégie de clôture sans refaire la Recette

Un seul candidat transversal, puis deux parcours représentatifs : GitHub ou Brevo READ via l'autorité commune et Make scénario READ via le catalogue spécifique sécurisé. Réception de leur exécution depuis une session Clara OS réelle, avec audit/revocation, en conservant les droits Production intacts jusqu'à GO. Ne pas exiger de l'utilisateur des tests unitaires ni lui faire manipuler les identifiants.

**NO-GO permanent tant que non validé :** READY, merge, Preview Vercel, déploiement Production, activation WRITE/SEND et opérations fournisseur.
