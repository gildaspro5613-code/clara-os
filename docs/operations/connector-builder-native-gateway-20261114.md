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

## Complément — raccordement adaptateurs et entrée Brain (même lot)

- `src/lib/connectors/core/native-connector-builder-runtime.ts` : couche réutilisable `nativeBuilderReadAuthority`, `nativeBuilderReadAudit`, accès au `CredentialStore` par la fonction SQL unique `native_read(..., 'credentials')`, résolution de connexion confinée, puis délégation aux adaptateurs GitHub/Brevo/Stripe **existants**. Aucune lecture directe de coffre par le rôle limité.
- `src/lib/connectors/core/native-connector-builder-admin.ts` : API interne unique `grant/revoke` exigeant une approbation explicite et un contexte natif écrivable, dont le SQL revérifie l'identité du signataire et les droits owner/admin. Aucune route publique ni consentement tacite.
- `src/lib/connectors/core/native-connector-builder-tool.ts` : entrée générique pour une future invocation par le Brain depuis une session Clara native, avec nom de capacité déclaré, JSON borné, zéro identité ou connexion fournie par le modèle, refus sans session, pas de retry automatique.
- Test `src/tests/connector-builder-native-gateway.test.ts` enrichi : refus des capacités WRITE/SEND et appel hors session, faux résultat, révocation pendant l'appel, entrée malformée. **À exécuter avant candidature Ready ou livraison ; ne pas annoncer PASS sans trace réelle.**

### Préflight final en lecture seule

Branche GitHub existante, HEAD `9237424350442e68184989a4a102edaac4f834bc` ; uniquement en isolation.
Base Neon : 0 capacité approuvée/activée dans le Builder, 0 grant, 0 journal, 0 session authentifiée non expirée ; Make toujours `CONFIGURED`. Ni PUBLIC ni le rôle provisionneur ne peuvent exécuter les fonctions de lecture/admin du Builder. Les tests négatifs sur SQL du clone ont refusé la session inventée.

### Définition de « terminé »

Le Builder ne sera **pas qualifié comme utilisable** tant que les contrôles suivants ne seront pas obtenus dans Clara OS avec la session réelle :
1. Un registre et une autorité applicative unique opérationnels sur la base existante (pas de copie du clone SQL hardcodée).
2. Une sélection/autorisation exploitable depuis l'interface ou la conversation pour un fournisseur déjà intégré, sans commandes SQL de l'utilisateur.
3. Deux fournisseurs différents passant le même chemin `grant → READ → revoke → refus`, avec journal et résultat réellement confirmé. Les cas Make scénario READ et Brevo sont des priorités, mais leur certification fournisseur demeure distincte.
4. Une proposition de livraison Production et plan de retour arrière soumis au GO explicite du propriétaire.

Le travail conservé dans cette branche est un **socle transversal candidat**, non la preuve d'un Builder complet ou d'un connecteur Make opérationnel.

## Mise à jour — découverte et pont central (14 novembre)

- `src/lib/connectors/core/native-connector-builder-discovery.ts` et SQL `docs/operations/connector-builder-native-discovery-clone.sql` ajoutés : la découverte ne publie que les capacités READ **déjà consenties**, vérifiées dans la session canonique utilisateur/workspace/client/projet, dont la connexion fournisseur est ACTIVE. La liste ne contient aucun secret et la lecture d'un catalogue n'est pas un appel fournisseur.
- `src/lib/brain/brain-source-registry.ts` publie ces seules capacités autorisées comme contexte cognitif non exécutable. Aucun outil n'est automatiquement activé parce qu'un fournisseur figure dans le catalogue.
- `src/lib/capabilities/capability-tool-bridge.ts` route les capacités READ reconnues, lorsqu'un contexte natif existe, vers `executeNativeBuilderToolCall` et la même passerelle auditée. Refus si l'identité ou l'espace du principal ne correspondent pas à la session ; pas de fallback sur les paramètres hérités `connectionId` fournis par le modèle. Le chemin historique sans contexte natif demeure inchangé.
- La découverte SQL a été installée uniquement sur le clone Neon isolé. Refus réel d'une fausse session : `NATIVE_SCOPE_DENIED` / SQLSTATE 42501. Autorisation EXECUTE du rôle limité : oui ; PUBLIC : non. Le rôle limité ne peut pas interroger la table des grants directement.
- Après ces opérations : 0 capacité activée, 0 grant, 0 entrée d'audit, 0 session OS authentifiée active, connexion Make toujours `CONFIGURED`.

**Limitations non levées :** la conversation native ne déclenche pas encore le `CognitiveToolLoop` avec outils ; l'entrée Builder est raccordée au pont de capacités existant, sans activation automatique dans le cycle Brain actuel. Les définitions Make READ ne sont pas encore normalisées dans le catalogue commun. Les scripts SQL de clone ont encore un rôle/une base/une entreprise de qualification explicites et ne constituent pas une migration multi-tenant de Production. Le test complet depuis une vraie session Clara et les nouveaux tests TypeScript ne sont pas exécutés : **ne pas annoncer le Builder fonctionnel ou livré.**

**Budget / sécurité :** aucun environnement Vercel créé, pas de preview, pas de déploiement, pas de merge, aucun appel fournisseur ni nouvelle consommation Make/Brevo, aucun secret lu ou renvoyé.

## Candidat de clôture applicative — avancement du 14 novembre, soirée

Cette section remplace les constats obsolètes des paragraphes précédents concernant l'absence d'appel depuis le Brain et l'absence de migration portable.

### Chaîne native maintenant préparée

1. **Manifestes reconnus** : le registre existant et la directory Builder découvrent GitHub READ, Brevo READ et **Make `make.drive.find` READ** (scénario interne fixe `find-drive-document`). Le générique `make.scenario.execute` reste `EXECUTE`, donc inaccessible dans cette voie.
2. **Sélection conversationnelle** : `src/lib/connectors/core/native-connector-builder-selection.ts` propose au modèle une seule fonction, contenant au plus une capacité READ préalablement accordée à l'utilisateur. Le modèle ne reçoit ni identifiant de compte, ni clé, ni workspace. Aucun appel si le message n'exprime pas une lecture explicite liée à un fournisseur reconnu.
3. **Exécution Brain** : `brain-source-registry.ts` appelle désormais ce sélecteur, puis fournit le résultat borné comme preuve externe non fiable ; l'échec ou l'absence de sélection explicite produit `CONNECTOR_READ_UNAVAILABLE` plutôt qu'un résultat fictif. Le repli direct sur `BREVO_API_KEY` a été retiré de cette conversation native. `capability-tool-bridge.ts` refuse le repli sur les anciennes opérations WRITE/SEND des connecteurs en contexte natif.
4. **Autorité réutilisable** : `native-connector-read-gateway.ts` journalise l'appel, certifie l'utilisateur/workspace/client/projet, vérifie l'autorisation une deuxième fois après retour fournisseur, refuse les clés/secret/identités arbitraires du modèle, et impose une unique connexion non ambiguë.
5. **Administration humaine** : `GET/POST /api/native/connectors` sous session canonique et vérification d'origine, avec `NativeConnectorBuilderPanel.tsx` intégré à la page Connexions, cinq langues, consentement READ explicite, révocation et absence de certification fictive. Le serveur autorise les changements uniquement sur l'utilisateur authentifié et revérifie les droits manager dans SQL.
6. **Migration commune** : `db/migrations/032_connector_builder_native_read.sql` est maintenant un **candidat SQL multi-tenant préparé**. Il ne contient plus de nom d'entreprise, rôle clone ou nom de base en dur. Son rôle d'exécution doit être explicitement validé/activé puis recevoir ses seuls privilèges d'usage/exécution à la livraison ; la migration elle-même ne les accorde pas. Aucun changement Production.
7. **Make** : une seule capacité commerciale de lecture est déclarée avec entrée `{query:string}`, scénario `find-drive-document` non modifiable par Clara, validation du reçu `executionStatus=completed`. Le jeton existant dans le clone reste chiffré avec la clé de clone indépendante : sa normalisation vers le coffre de l'environnement déployé devra être effectuée par une procédure de migration approuvée, **sans affichage du jeton**.

### Vérifications réellement effectuées

- 20 contrôles de cohérence de fichiers et de liens fonctionnels ont été satisfaits en lecture directe GitHub (vérification des sources ; **pas des tests exécutés**).
- Vérification SQL négative sur clone : la fausse session est refusée ; rôles PUBLIC sans EXECUTE, 0 grant et 0 catalogue approuvé.
- Le préflight Neon indique 1 jeton Make chiffré, connexion toujours CONFIGURED, zéro certification, zéro session OS active sur le clone, zéro scénario actif.
- Aucun déploiement de la branche Builder observé parmi les 20 derniers déploiements Vercel consultés.
- Les nouveaux tests Node/TypeScript existent mais **leur exécution complète, le typecheck, le build et une réception depuis l'interface ne sont pas attestés**. Ne pas présenter un statut PASS inventé.

### Conditions de livraison restant obligatoires

1. Exécuter **une validation isolée unique**, avec tests TypeScript ciblés, `tsc --noEmit` et build, sur cette branche. Réparer toute erreur.
2. Faire examiner et installer de façon contrôlée la migration 032 (sauvegarde Neon, compte de service restreint, permissions, retour arrière), **uniquement sur GO Production distinct**.
3. Qualifier une session authentifiée dans OS existant et le parcours READ complet de deux fournisseurs (en particulier Make et Brevo lorsque leurs accès fournisseurs sont réellement prêts), avec approbation/revocation et journal. Aucun environnement de Recette supplémentaire.
4. Tant que ces preuves ne sont pas disponibles : **NO-GO Ready / merge / Preview / Production / WRITE / SEND**. Le code est candidat, pas livré.

Le principe produit est maintenu : une intégration fournisseur se fait une fois au niveau de la plateforme ; chaque client autorise ensuite son propre compte depuis une interface, sans code, SQL ou Codespaces.
