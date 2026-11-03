# IONOS — réception opératoire de la première boîte (préparation uniquement)

Date : 2026-11-03. Branche de référence Production : `delivery/clara-os-v1-20261025`, commit `8af60826c123f6b52f75b59d401de306475e237a`.

## Portée strictement autorisée

Préparer `clara@melodie.digital` en réutilisant exclusivement les mécanismes natifs existants. **Aucune insertion, aucun envoi de message, aucune modification de secrets Vercel, aucune activation réseau, aucun déploiement n'est autorisé par ce document.** Le gel fonctionnel OS/Live demeure.

## État vérifié en lecture seule (Neon Production)

- Projet Neon : `fragrant-dream-31652403`, branche `br-lucky-shape-b2f818cc`.
- Workspace : `melodie-digital`; client : `melodie-digital-interne`; projet : `clara-os-exploitation`.
- Identité de membre active : `adba3e37-2691-4569-8972-4f123110dd42`.
- Pour cette identité : `can_read=true` et `can_manage=true` aux niveaux client et projet, avec autorisations non révoquées. **Cela ne prouve pas** à soi seul l'identité owner/reviewer à inscrire dans le manifeste ; demander approbation explicite.
- Enregistrement natif IONOS : zéro `clara_connections` provider `ionos`, zéro `clara_native_mail_authority`, zéro `clara_native_mail_messages`.
- Vercel Production : variable `CLARA_CREDENTIALS_ENCRYPTION_KEY` correctement nommée présente (métadonnées seulement). Codespace : variable homonyme définie et format AES-256 valide. **Égalité des deux valeurs NON démontrée.**
- Codespace : aucun `DATABASE_URL` ou `POSTGRES_URL` configuré ; `psql` et `node` présents ; CLI `vercel` absente.
- `CLARA_IONOS_NETWORK_ENABLED` n'est pas présente dans Codespace. La valeur Production et la configuration monitor doivent être attestées séparément.
- L'adresse et l'existence chez le fournisseur sont confirmées par le propriétaire ; les mots de passe sont disponibles chez le propriétaire, **jamais partagés dans le chat**.

## Réutiliser les éléments natifs

- `src/lib/connections/credential-store.ts` : AES-256-GCM, `encryptCredentialPayload`.
- `src/lib/connectors/ionos/transport.ts` : schéma `MailCredentials`, `validateMailConfig`, lecture IMAP en mode read-only. Paramètres historiques déclarés : `imap.ionos.fr:993`, `smtp.ionos.fr:465`; jamais prétendre certification réseau sans test.
- `src/lib/native/mail-authority.ts` : stockage natif uniquement en lecture, `MAIL_PROVISIONING_DISABLED` intentionnel.
- `docs/issue-216-google-ionos-20261027/ionos/approved-operation-template.sql.txt` : transaction administrative paramétrée. **Ne pas** exécuter ce template dans un SQL Editor avec des chaînes littérales sensibles.

## Manifeste de première boîte — champs à attester avant écriture

| Champ | Référence | Statut |
|---|---|---|
| Workspace | `melodie-digital` | Vérifié |
| Client | `melodie-digital-interne` | Vérifié |
| Projet | `clara-os-exploitation` | Vérifié |
| Boîte | `clara@melodie.digital` | Confirmée par le propriétaire |
| Owner canonique | Identité active `adba3e37-2691-4569-8972-4f123110dd42` candidate | **Attribution à approuver**, jamais déduite de l'adresse |
| Reviewer canonique | Non attesté | **Bloquant** ; ne pas inventer ou assumer la même identité |
| Connection ID | Aucun historique natif confirmé | **Bloquant** ; allocation explicite sous GO si nouvel ID |
| Credential | Mots de passe disponibles seulement chez le propriétaire | **Bloquant** ; aucune valeur dans GitHub, chat, logs ou SQL Editor |
| Clé runtime Production | Variable présente | **Bloquant** ; vérifier compatibilité sans révéler la clé |
| Référence de sauvegarde/récupération Neon | Non attestée dans cette réception | **Bloquant** |
| Client SQL à paramètres liés, opérateur restreint | Non attesté | **Bloquant** |
| Dossiers | `INBOX` candidat | Validation propriétaire requise |
| Réseau et monitoring | Doivent rester désactivés | Vérification Production requise |

## Conditions strictes de passage à l'exécution

1. Attester la base réelle, un point de restauration récent, un rôle opérateur minimal et le propriétaire/reviewer autorisés.
2. Confirmer que la clé de chiffrement utilisée pour la nouvelle enveloppe est exactement celle qu'utilise le runtime Production. **Ne pas utiliser un simple test de longueur comme preuve**. Ne pas imprimer ni dériver d'empreintes de la clé dans le chat ou dans les logs.
3. Définir un chemin de saisie local/sécurisé : entrée masquée du mot de passe, chiffrement en mémoire et paramètres SQL liés via client authentifié, sans création de fichier contenant plaintext ou secret, sans affichage de l'enveloppe ni journalisation des paramètres ; supprimer les buffers secrets après opération quand c'est possible. Ne pas diffuser un SQL `INSERT` avec données en clair ou une enveloppe collée dans Neon SQL Editor.
4. Ne commencer qu'avec `clara@melodie.digital`, hors exploitation mail ; aucun `UPSERT`, aucune écriture dans Google, aucun DDL, aucun grant élargi.
5. Sous GO explicite de **l'insertion Production**, exécuter la transaction administrative existante, vérifier le triplet connexion + credential + autorité, et `COMMIT` après vérification. Si doute, `ROLLBACK`. Ne jamais assimiler `ACTIVE` à une preuve IMAP.
6. Sous GO séparé, activer le réseau pour un **seul essai IMAP de lecture** en situation contrôlée. Aucun envoi SMTP ni monitoring automatique.
7. Répliquer aux quatre autres boîtes seulement après réception concluante, jamais automatiquement.

## Décisions et limites

Cette branche ne contient qu'un dossier de réception ; aucun secret, script qui modifie Neon, ni changement applicatif. Elle ne rend pas les boîtes opérationnelles par elle-même. Le blocage concret restant est le canal de provisionnement administrateur à paramètres liés avec clé Production attestée. La procédure et les barrières existantes doivent être conservées, pas contournées.
