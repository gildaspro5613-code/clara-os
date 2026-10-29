# Enrôlement Google Recette — opération administrative unique

Préparation logicielle seulement. Aucune invitation réelle activée, aucune écriture distante, aucun déploiement. L'autorisation de livraison précédente reste consommée. Le workflow de livraison conserve ses références et verrous : il n'est ni lancé ni réarmé par ce correctif.

## Parcours préparé

Une invitation administrative privée autorise un seul enrôlement, pendant 30 minutes à compter de son activation SQL. Elle est restreinte à l'adresse Google expressément approuvée par l'administrateur. L'adresse est une condition d'admissibilité vérifiée (`email_verified=true`), **jamais une source de subject** : signature Google, issuer, audience, expiration, nonce et consommation unique du state restent vérifiés dans le parcours existant. Le subject est exclusivement celui des claims vérifiés.

Le ticket n'est ni dans une URL ni dans les logs. Son empreinte et l'empreinte de l'adresse attendue utilisent la table existante `clara_auth_sign_in_transactions`, provider distinct `google-recette-enroll-v1`. Aucun nouveau schéma, service ou credential n'est nécessaire. Une seule autorisation de ce provider est permise, même après expiration/consommation : aucune réémission automatique. Les empreintes restent dans le canal administratif privé, jamais publiées dans GitHub.

À la réception du callback authentifié, la transaction verrouille l'autorisation puis crée uniquement le workspace `melodie-digital-recette`, un nouvel utilisateur UUID distinct de la fixture, son identité canonique Google et son appartenance `member`. Elle consomme l'invitation dans la même transaction. Toute identité déjà enregistrée, workspace déjà présent, collision ou autorisation consommée/expirée est refusée sans réaffectation ni réactivation. La fixture PR #176 et les autres autorités ne sont jamais modifiées. Aucun client/projet/document/mission/session n'est créé par l'enrôlement ; la session normale est délivrée ensuite par le parcours existant.

Une interruption avant COMMIT annule tout l'enrôlement. Après un COMMIT dont l'acquittement est perdu, ne pas rejouer l'invitation : contrôler le résultat en lecture seule puis utiliser la connexion Google ordinaire, qui efface le cookie d'invitation périmé. Ne jamais réutiliser une identité ou appartenance révoquée pour contourner un refus.

## Préparation privée, sans accès distant

Sur le poste administratif habilité, créer avec un éditeur local un fichier privé (mode 0600), contenant seulement l'adresse Google du propriétaire expressément autorisée. Ne pas la passer en argument ni la publier. Choisir un répertoire de sortie inexistant **hors du dépôt**.

```bash
node --import tsx src/scripts/prepare-recette-google-enrollment.mts \
  --prepare-single-google-enrollment /chemin/prive/compte-google.txt \
  /chemin/prive/invitation-recette
```

Ce préparateur n'utilise aucune connexion SQL ni aucun fournisseur. Il produit `invitation.txt` et `authorize.sql` dans un dossier 0700, fichiers 0600. La valeur de l'invitation et l'adresse ne figurent ni dans le SQL ni dans stdout. Ne pas commiter, joindre à une Issue, publier en artefact ou capturer ces fichiers. Remettre l'invitation uniquement au propriétaire par le canal privé approuvé.

## Deux opérations nécessitant un nouveau GO

1. **Activation administrative** : vérifier dans les métadonnées du connecteur existant la cible `fragrant-dream-31652403` / `br-crimson-feather-b2zr00sf` / `neondb`, puis exécuter une fois `authorize.sql` sous autorisation explicite. Un nom SQL `neondb` ne prouve pas la branche. L'opération insère uniquement une autorisation d'authentification ; aucun utilisateur, workspace ou droit SQL n'est provisionné à ce stade. Aucune extension automatique de privilèges : un refus impose l'arrêt. Avant activation, qualifier les privilèges SELECT/INSERT des tables auth et UPDATE de la table de transactions, USAGE PL/pgSQL et EXECUTE du verrou. Une éventuelle insuffisance est rapportée, sans GRANT.
2. **Livraison volontaire unique** : approuver le nouveau SHA applicatif et le contrôleur exact après CI ; adapter sous cette autorisation les références de source et d'artefact du workflow existant (c203cd7 et les fichiers d'attestation figés ne contiennent pas ce correctif). Ne pas réutiliser l'ancien marqueur consommé. Les contrôles Vercel/Neon avant Next.js restent bloquants. L'attestation d'identité existante reste inchangée ; en son absence, le build n'est admissible que si une invitation unique, non consommée et encore valide ainsi que tous les droits nécessaires sont effectivement lus. Le log distingue alors `ATTESTATION_MODE=ONE_TIME_GOOGLE_ENROLLMENT` : cela n'atteste **pas** une identité déjà enrôlée. Erreur de lecture/configuration/binding : arrêt. Une invitation expirée ne permet plus cette exception.

Planifier activation et livraison ensemble pour terminer dans les 30 minutes. Si ce délai est dépassé ou si le résultat est incertain : arrêt, lecture de l'état réel et nouvelle décision administrative explicite, sans suppression/réinitialisation automatique de l'autorisation ni nouvel essai de livraison.

## Connexion du propriétaire après READY et alias attesté

Ouvrir `https://clara-os-recette.vercel.app/auth/recette-enrollment`, saisir l'invitation privée puis sélectionner le compte Google autorisé. Le POST est limité à l'origine stable, le ticket est transmis au callback par cookie HttpOnly/Secure ; OAuth utilise les routes et le client existants. Tout autre compte ou toute invitation invalide est refusé. Aucun bootstrap libre n'est activé. Les connexions suivantes utilisent le bouton Google habituel.

Le rôle `member` ne donne aucun droit de gestion des connexions ni aucun accès implicite aux clients/projets/données existants. Une page vide ou un refus métier après connexion n'autorise pas à accorder des ACL supplémentaires.

## Validation post-opération — lecture seule, sans identité sensible

Sélectionner explicitement la même branche autorisée puis exécuter :

```sql
BEGIN TRANSACTION READ ONLY;
SELECT
 (SELECT count(*)=1 FROM public.clara_auth_identities i
  JOIN public.clara_auth_users u ON u.id=i.user_id
  JOIN public.clara_workspace_memberships m ON m.user_id=u.id
  WHERE i.issuer='https://accounts.google.com' AND length(trim(i.subject))>0
   AND m.workspace_id='melodie-digital-recette'
   AND m.role='member' AND m.revoked_at IS NULL
   AND u.id<>'recette-176-fictional-user-v1') AS google_member_present,
 (SELECT count(*)=1 AND bool_and(consumed_at IS NOT NULL)
  FROM public.clara_auth_sign_in_transactions
  WHERE provider='google-recette-enroll-v1') AS authorization_consumed,
 EXISTS(SELECT 1 FROM public.clara_workspace_memberships m
  JOIN public.clara_auth_identities i ON i.user_id=m.user_id
  WHERE m.user_id='recette-176-fictional-user-v1'
   AND m.workspace_id='recette-176-fictional-workspace-v1'
   AND m.role='owner' AND m.revoked_at IS NULL
   AND i.issuer='urn:clara:recette:fixture:v1'
   AND i.subject='fictional-operator-v1') AS fixture_present;
ROLLBACK;
```

Ces booléens ne remplacent pas la vérification cryptographique exécutée lors du callback. Conserver en privé la référence d'autorisation, la cible, les dates et le résultat ; aucun subject, ticket, cookie ou jeton. La conservation intégrale de la fixture s'établit aussi par comparaison avec son état avant opération, sans afficher de sessions.

## Limites de réception

Les tests PostgreSQL utilisent une base jetable et un rôle non propriétaire ; les signatures Google sont synthétiques, vérifiées par le code réel. Aucun appel Google réel ni enrôlement distant n'a été exécuté. La première connexion réelle reste à réceptionner après les deux GO. Production inchangée.

Résultats locaux : 12 tests ciblés PASS (incluant concurrence réelle, expiration, révocation d'invitation, collision, rollback forcé, confidentialité et refus Production) ; 43 tests auth/isolation/attestation/fournisseurs de non-régression PASS ; 1 recette Chromium PASS sur le build optimisé (formulaire utilisable et POST d'origine étrangère refusé, pas une connexion Google réelle). Zéro test ignoré dans ces commandes. La conservation des quatre objets de fixture est comparée intégralement après l'enrôlement synthétique. TypeScript, ESLint ciblé et `git diff --check` PASS.

Le build optimisé Webpack avec `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/tmp/recette-fonts.cjs` et `NEXT_TELEMETRY_DISABLED=1` passe ; même dispositif local que les réceptions historiques. Le build standard Turbopack a d'abord rencontré le lien node_modules partagé hors du checkout, puis le refus réseau Google Fonts une fois ce lien remplacé temporairement par des fichiers locaux. La disposition initiale a été rétablie ; aucune configuration applicative, dépendance ou police de Production n'a été changée. Le succès local ne certifie pas le build Vercel, la typographie finale ni les CI distantes.

Commandes de reproduction ciblées :

```bash
node --import tsx --test src/tests/recette-google-enrollment-postgres.test.ts \
  src/tests/recette-google-enrollment-route.test.ts \
  src/tests/recette-google-enrollment-preparation.test.ts \
  src/tests/recette-google-sign-in.test.ts src/tests/recette-oauth-reception.test.ts
```

Le test PostgreSQL exige uniquement un conteneur **local jetable** nommé `clara-recette-enrollment-test`, PostgreSQL 17 ; le workflow de sécurité existant le crée et le détruit. Il ne lit pas de connexion distante et n'utilise que des identités synthétiques. La recette navigateur exige `RECETTE_ENROLLMENT_E2E_ORIGIN=http://127.0.0.1:<port>` et refuse tout autre hôte ; `DOCUMENTS_E2E_CHROMIUM` peut désigner le navigateur local déjà installé. Elle bloque les transports hors de cette origine et ne soumet aucune vraie invitation.
