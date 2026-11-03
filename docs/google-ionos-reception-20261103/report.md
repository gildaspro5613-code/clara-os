# Réception Google / IONOS — correctif ciblé

Base Production : `76818bbba9bd3ef299306696ed4eb560d74c2363`. Branche : `fix/google-reconnect-ionos-reception-20261103`. Aucun accès administratif Neon/Vercel disponible dans ce runtime ; aucune inspection Production nouvelle n'est revendiquée.

## Google : cause démontrée et limite Production

Le POST de sélection existant appelle `googleAuthority()` avant d'enregistrer la sélection. Dans [la fonction native versionnée](../../db/migrations/020_native_google_workspace.sql), après les contrôles d'identité, appartenance, contexte propriétaire et délégation, la condition `co.status <> 'ACTIVE'` lève `NATIVE_GOOGLE_REAUTH_REQUIRED` / SQLSTATE `42501`. [databaseError](../../src/lib/canonical/registry.ts) le convertissait en `REGISTRY_ACCESS_DENIED`.

**Reproduction PostgreSQL réelle** : propriétaire et identité Google valides, droits du projet présents, même connexion ; passer uniquement le statut à `RECONNECT_REQUIRED` produit le refus générique. Après correction : toujours HTTP 403, mais code public précis `NATIVE_GOOGLE_REAUTH_REQUIRED`. Avec statut ACTIVE : sélection persistée. Ni ACL ni SQL métier ne sont modifiés.

Le statut communiqué pour la connexion Production est donc suffisant pour expliquer ce refus dans le contrat reçu. **Sans lecture du contexte exact de la requête Production, il n'est pas attesté qu'un garde antérieur ne refuse pas aussi la requête.** Des droits simplement présents ne prouvent pas leur correspondance au client/projet/fil sélectionné, leur non-révocation ou le droit de gérer la sélection. Le SELECT ciblé [google-authority-readonly.sql](google-authority-readonly.sql) vérifie ces correspondances par booléens, sans retourner issuer/subject, cookie ou contenu métier. L'authentification HTTP doit être attestée séparément dans la session actuelle ; le SELECT ne la remplace pas. NULL signifie non attesté, jamais autorisé.

## Corrections minimales

| Fichier | Modification |
|---|---|
| `src/lib/native/google-authority.ts` | Préserve exclusivement le refus SQL connu de reconnexion. Les autres messages SQL restent filtrés et les autres refus de droits restent inchangés. |
| `src/lib/native/authority.ts` | Si la capacité Calendar est false, réutilise l'autorité Google pour distinguer statut à reconnecter et scopes manquants ; le refus reste bloquant. Aucun nouveau droit ni chemin de chargement. |
| `src/app/api/connections/google/connect/route.ts` | Paramètre `capability: reconnect` dans la route existante : connexion existante obligatoire et scopes exactement repris du registre. Aucune création/fallback en son absence. Identité, propriétaire, rôle, nonce, state, callback et contrôle de subject existants conservés. Les autres profils sont inchangés. Le profil historique `existing` demande Drive complet : il n'est PAS utilisé pour cette reconnexion. |
| `src/components/native/NativeDocumentsPanel.tsx` | Sélection désactivée tant que la connexion n'est pas ACTIVE ; action de reconnexion sur la connexion choisie réservée au propriétaire. Le serveur continue de vérifier les droits. Messages Google traduits et compréhensibles ; UUID retirés du texte des options, remplacés par « Compte Google N », sans inventer d'email ou d'identité. |
| `src/components/cockpit/widgets/agenda/AgendaWidget.tsx` | Uniquement le libellé d'erreur de reconnexion ; aucun changement graphique, de position ou de widget. |
| Dictionnaires FR/EN/ES/DE/IT | Messages et libellés correspondants. |

Le consentement de reconnexion conserve les scopes existants ; il n'ajoute pas automatiquement Calendar ou Drive. Après renouvellement, une absence réelle des scopes Calendar requis reste un refus de consentement, jamais un agenda vide. Toute extension de scopes nécessiterait une justification et une validation distinctes via le mécanisme existant.

## IONOS : état des références

Procédure [#217 relue et réutilisée](../issue-216-google-ionos-20261027/ionos/readonly-reconciliation.md), avec son [template administratif existant](../issue-216-google-ionos-20261027/ionos/approved-operation-template.sql.txt). Les cinq boîtes existantes sont celles attestées par le propriétaire ; aucune nouvelle boîte ou identité proposée.

La branche historique `fix/ionos-draft-ui-reliability-20261021`, SHA `d3dbe8effb9812ad3b07c4287550172ec9a72d49`, a été récupérée en lecture et son inclusion dans la référence Production est confirmée par Git. Elle contient le transport, CredentialStore et les autorités natives déjà consolidés. Aucun connectionId IONOS réel ou référence privée de coffre exploitable n'a été identifié dans les preuves accessibles. L'ancien `b02b1dd` n'est pas disponible dans les objets locaux consultés ; il n'est pas déclaré récupéré.

**Références sécurisées distantes : NON ATTESTÉES**, pas déclarées supprimées. Le constat actuel de zéro autorité native vient du propriétaire. Il ne démontre pas zéro connexion historique, zéro credential chiffré ou la disparition d'un coffre. [ionos-reference-presence-readonly.sql](ionos-reference-presence-readonly.sql) prépare seulement les compteurs de présence, sans lire/exporter les valeurs chiffrées.

Avant toute insertion : manifeste privé approuvé pour une boîte, avec connectionId attesté, propriétaire/reviewer canoniques, workspace/client/projet exacts, preuve de propriété indépendante de l'adresse, référence sécurisée existante et compatibilité avec la clé runtime attestées. Ne rien déduire d'un email. Si une référence manque, arrêter : aucune valeur ou identité n'est inventée. Le template #217 reste soumis à un GO d'écriture distinct, à la sauvegarde et aux préconditions documentées. Aucun INSERT, GRANT, credential, IMAP, SMTP, monitoring ou changement de configuration distante effectué ici.

## Validation / décision

Voir [results.txt](results.txt) et [captures ciblées](captures/). PostgreSQL réel local, routes natives réelles ; fournisseur Google simulé et navigation de consentement interceptée. Ni consentement Google réel ni réception IMAP certifiés. Les changements du préchargement navigateur ne restituent qu'un message SQL connu et filtré ; la barrière anti-chargeur global reste intacte. Les tests existants sont conservés ; seule l'attente du message public Google est adaptée dans la recette UI historique. Le nouveau test PostgreSQL est exécuté par la suite Google existante, sans nouveau workflow.

**Livrable immédiatement révisable** : correctif d'erreur/reconnexion et UI, sans changement du Brain, vocal, modèles SQL, connecteurs IONOS ou graphisme du Cockpit. Exclusion de déploiement automatique de cette branche ajoutée au garde Vercel versionné ; aucun réglage distant modifié.

**Actions propriétaire restantes** : (1) confirmer les booléens Google dans le contexte exact via l'accès Neon existant ; corriger une sélection de contexte erronée par les commandes existantes si nécessaire, jamais par un élargissement de droits ; (2) après GO distinct de livraison, renouveler la connexion existante avec le même compte Google via le consentement natif, puis vérifier Drive et un événement du calendrier autorisé ; (3) attester les références et le manifeste IONOS privé, puis autoriser séparément le rapprochement administratif et sa réception ultérieure.

GO technique isolé du correctif si tous les contrôles consignés passent. **NO-GO pour déclarer Google/IONOS opérationnels en Production** avant ces preuves et réceptions. Aucun merge ni déploiement exécuté.
