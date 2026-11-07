# Fournisseurs — Clara OS V1

Aucun fournisseur métier réel n’a été appelé pendant cette mission. Aucune clé,
connexion, autorisation fournisseur, boîte, DNS ou configuration Production modifiée.
Les déclarations du propriétaire sont conservées ; elles ne sont ni contredites par
l’absence d’accès Codex, ni transformées en tests exécutés sur le candidat.

| Fournisseur | Configuration / preuve acquise | Preuve de cette réception | Limite et action minimale |
|---|---|---|---|
| IONOS | Le propriétaire confirme les cinq boîtes existantes, IMAP imap.ionos.fr:993 SSL/TLS, SMTP smtp.ionos.fr:465 TLS implicite, identités distinctes. Code 016/018/021/022/023 et #199 préservé. | NativeMail, transactions PostgreSQL, envois simulés, approbation exacte, refus propriétaires/projets, concurrence, incertitude, chiffrement, pagination et monitoring SQL. | Aucun IMAP/SMTP réel. `b02b1dd` et ses 117 tests ne sont pas récupérés. Pas de certification de la classification financière/antifraude ou de la langue d’une réponse réelle. Aucun changement de configuration demandé sans défaut établi. |
| Make / Brevo | Le propriétaire atteste Make 7294540 « CLARA – Sync Brevo Contact », 7291299 « CLARA – Notify Team », actifs à la demande, connexion MelodieDigital_Brevo ok ; aucune exécution retrouvée. | Adapters, politiques, gates et transports simulés ; un HTTP 200 portant un échec explicite est désormais refusé ; un accusé pending/accepted n’est plus annoncé « exécuté avec succès ». | Aucun contact ou message réel créé. Mapping scénarioKey ↔ IDs ↔ webhook, contrat effectif et idempotence métier non attestés. Garder les exécutions non certifiées indisponibles. |
| Google Workspace | Raccordement réel fonctionnel confirmé par le propriétaire ; code natif, CredentialStore, scopes/identité et autorités conservés. | Après correction 026/028 : propositions, approbations exactes, CAS, versions/ETag, révocation, perte d’acquittement et reprise sur PostgreSQL réel ; API fournisseur simulée. Navigateur détaillé dans le rapport final. | Aucun besoin de recréer la connexion n’est démontré. Signature/nonce/consentement simulés ≠ nouvelle certification Google réelle ou preuve du rôle SQL distant. |
| Twilio | Essais réels antérieurs attestés par le propriétaire. | Tests des refus des routes et de non-exposition ; SDK non modifié. | Aucun appel. Autorité et UI natives contextualisées non reçues de bout en bout sur ce candidat ; conserver l’indisponibilité déclarée. Ne pas demander une nouvelle connexion fournisseur. |
| ElevenLabs | Essais réels antérieurs attestés ; rotation éventuelle signalée. | Tests de sécurité des routes existantes ; SDK/identifiants inchangés. | Aucun microphone, STT/TTS ou session fournisseur réelle. Aucune valeur de clé consultée. Ne pas déduire un défaut de clé ni demander une rotation. |

## Make : chemin exact et limites

- Appels génériques : `CapabilityToolBridge` → `CapabilityEngine` →
  `MakeCapabilityExecutor` → `ConnectorEngine` → `MakeExecutableConnector` →
  `MakeConnectorAdapter` → `MakeWebhookClient`.
- Connexion résolue par workspace, statut ACTIVE et scope explicite
  `make:scenario:<scenarioKey>`. Les URL/headers viennent du CredentialStore,
  jamais d’une URL fournie dans la mission. La préparation ne fait pas de transport.
- Autre entrée existante : `/api/external/capabilities` → authentification produit,
  allowlist de capacités/workspace → `ExternalCapabilityGateway` → même adapter.
  Ce contrat produit n’est pas une preuve d’approbation humaine IONOS exacte.
  Ne pas y autoriser un scénario de correspondance pour contourner ce circuit.
- Le client envoie `{scenarioKey,payload,source:"clara-os"}`. Le scénario attesté
  par le propriétaire attend `workspaceId,email,source` ou
  `workspaceId,message,recipient,priority,missionId`. Le mapping d’entrée Make
  doit être attesté : sa compatibilité n’est pas inférée de l’existence du webhook.
- La sortie générique conserve `data`, `executionStatus` et un éventuel
  `executionId`. Elle ne prouve pas à elle seule que `contactId`/`messageId` sont
  persistés dans Contacts/Missions/Journal. Aucun mapping des deux IDs numériques
  n’est versionné dans ce candidat ; ne pas inventer leur configuration chiffrée.
- L’audit générique du Tool Bridge peut classer SUCCEEDED un retour technique accepté ; il ne doit pas être interprété comme preuve de création de contact, de notification ou de livraison. La réception métier de ces deux scénarios reste bloquée.
- Un timeout n’a pas de reçu métier concluant. Le client fait un seul POST ;
  aucun retry automatique ajouté. Le booléen technique `retryable` d’une erreur
  ne constitue pas une autorisation de rejouer une notification. Le pipeline
  générique n’est pas reçu comme garantissant une déduplication métier de ces
  deux scénarios. L’exécution reste hors de la réception utilisateur autorisée.
- Les routes de gestion Make/Brevo natives restent fermées par leur fence tant
  qu’elles ne sont pas certifiées. Une page Automatisations ou un statut de
  connexion ne doit pas être pris pour une opération fournisseur attestée.

Action propriétaire minimale : attester, sans URL secrète ni clé, les correspondances
scenarioKey/scopes/IDs, le mapping des entrées/sorties et le comportement d’idempotence.
Ensuite seulement, autoriser une recette limitée explicitement désignée. « Notify Team »
ne doit jamais être utilisé pour envoyer une correspondance commerciale en évitant
l’approbation IONOS, ni pour interrompre sur la seule présence du mot « urgent ».

## IONOS : états et politique conservés

Tous les envois restent contrôlés. Aucun mode autonome n’est activé pour clara@,
contact@ ou info@ ; support@ et gildas@ conservent l’approbation propriétaire.
La délégation future limitée aux réponses générales n’est pas déclarée implémentée
à partir du code V1 inaccessible.

Le brouillon persiste dans la Mission, l’opération dans le ledger mail existant :
`pending` → `approved` → `processing` → `sent` / `failed` / `uncertain`.
`sent` est affiché dans l’interface comme **transmission SMTP acceptée** ; ce n’est
pas une preuve de livraison au destinataire. Aucun état livré ou accusé DSN réel
n’est certifié. Une approbation n’est jamais une preuve d’exécution.

Expéditeur, destinataires, contenu/version, Mission, propriétaire, révision d’autorité
et identifiant durable sont revalidés. Modifier l’enveloppe invalide l’approbation.
Un `processing` abandonné ou `uncertain` ne permet pas une répétition automatique.
La relève reste opt-in, désactivée par défaut, avec rôle SQL de service distinct des
sessions utilisateur ; le cron secret n’est pas une autorité de boîte. Les tests de
reprise/déduplication/révocation utilisent exclusivement PostgreSQL jetable.
