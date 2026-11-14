# Lot 2 bis — IONOS : réception isolée

Commit applicatif testé : `add5224490bb065ec998a185a86eff6bb2d291db`.

Référence de départ : `6cb51f87a85013231cabfc4bf227ec07b7175207`. Branche existante `fix/os-operational-reception-175`, PR #176 Draft. Aucun changement Clara Live, fournisseur réel, secret Production, configuration Vercel ou migration Production. Résultats et SHA exact dans `lot-2-bis-evidence.json`.

## Réutilisation et changements nécessaires

| Existant réutilisé | Extension justifiée |
|---|---|
| Identités vérifiées, memberships, ACL workspace/client/projet, sélection native et sessions | Autorité de boîte explicitement attestée sur les IDs canoniques ; délégations révocables limitées au client/projet |
| `clara_connections`, AES-256-GCM `CredentialStore` | Deux connexions IONOS distinctes ; aucune sélection globale ou défaut implicite |
| Acquisition/Contacts, qualification et lifecycle existants | Création de contact après saisie/confirmation explicite, provenance interne `clara-os/email-reviewed` ; le validateur externe website demeure inchangé |
| Missions, Session, conversation et Journal natifs ; CAS existant | Références email et brouillon chiffré dans la Mission ; conversation conservant un avis de préparation sans corps email ni pièces jointes |
| Contrat commercial V1 et révision des brouillons | V2 compatible à côté du V1 : enveloppe explicite, destinataires, pièces jointes et révision. **Migration 014, contrat V1 et parcours lot 1 inchangés** |
| `clara_tool_approvals` | Approbation propriétaire à usage unique, expirant après dix minutes, liée au hash de la révision exacte |
| Core/Brain et Responses, sans outils exécutables | Email traité comme source non fiable dans un cycle temporaire, mutations temporaires écartées ; seul le brouillon relu par l'utilisateur devient durable |
| Clara et Cockpit existants, cinq langues | Panneau de messagerie dans Clara et états dans Cockpit ; pas de nouveau logiciel ou store de contacts/missions/conversations |

Code ajouté : `connectors/ionos/transport.ts`, `native/mail{,-authority}.ts`, `acquisition/mailbox-communication-draft.ts`, `/api/native/mail`, `NativeMailPanel.tsx`, migration 016, fixtures et tests. Dépendances maintenues ajoutées : ImapFlow, Nodemailer, Mailparser et leurs types. Les autres versions applicatives déclarées ne sont pas changées.

## Identités et accès

Seules `clara@melodie.digital` et `gildas@melodie.digital` sont admissibles. Elles n'identifient **jamais** un utilisateur canonique par rapprochement d'email. L'autorité lie un connectionId à un ownerUserId canonique explicitement attesté, un workspace et une adresse de boîte. Propriété/reviewer/motif immuables ; pas d'endpoint permettant de s'approprier une boîte. Un rôle administrateur ne donne pas accès à la boîte Gildas.

La préparation et la lecture peuvent être explicitement déléguées dans un client/projet autorisé. Le propriétaire atteste d'abord le rattachement du message au projet ; un délégué peut ensuite lier ce message déjà attesté à **sa propre** Mission et son propre Contact. Les objets privés d'un autre utilisateur ne sont pas chargés. Créer un contact requiert nom/adresse saisis et confirmés ; aucun rapprochement automatique par From, nom, titre ou dernière mission.

Les deux boîtes exigent une approbation explicite de leur propriétaire pour envoyer. Cette règle est volontairement plus stricte que toute future autonomie commerciale. Le propriétaire de Gildas peut relire uniquement la réponse qu'un délégué lui a explicitement soumise : pas sa Mission entière ni sa conversation privée.

Chaque commande SQL appelle l'autorité native existante et prend le verrou workspace avant les lignes de boîte/opération. Propriété, identité vérifiée, membership, ACL client/projet, délégation et révision sont revérifiés ; à l'envoi les droits du préparateur, l'attestation du contact et le hash de la Mission sont également revérifiés. Révocation de boîte irréversible pour l'attestation : un renouvellement nécessite une nouvelle connexion et une nouvelle attestation administrative examinée, sans réaffecter les anciens objets.

## Transport, contenu et synchronisation

Le réseau est **désactivé par défaut** : `CLARA_IONOS_NETWORK_ENABLED` doit être explicitement `true` pour que la factory de production construise le transport. Aucun test ne l'active. Les tests injectent les fournisseurs au point de création du transport ; pas de mode de simulation activable depuis une requête HTTP.

Credentials par connexion, chiffrés par le CredentialStore existant : adresse, mot de passe, hôtes et ports IMAP/SMTP, dossiers autorisés et indicateur de revue de configuration. Ni le modèle ni le navigateur ne reçoivent ces credentials. Pas de logs de protocole/authentification. Pas de lecture de credentials Production dans ce chantier.

Les paramètres IONOS réels restent à confirmer dans la documentation officielle et le compte avant activation : les noms d'hôtes utilisés dans les fixtures sont synthétiques du point de vue des échanges, pas une certification du compte. Le transport exige IMAPS 993, SMTP TLS implicite 465 ou STARTTLS obligatoire 587, vérification des certificats et TLS >=1.2 ; hôtes IONOS explicitement contrôlés, aucun hôte libre ou localhost accepté par la configuration réelle. Aucun changement 2FA ni mot de passe d'application supposé.

IMAP : verrou de dossier en lecture seule, liste de dossiers limitée à la configuration, UIDVALIDITY + UID, curseur durable avec CAS, 25 nouveaux messages par synchronisation, inventaire maximal de 5 000 UID. Le téléchargement MIME demande une portion bornée à 1 MiB +1 avant parsing ; dépassement refusé, sans avance du curseur. Délai total IMAP 30 secondes, socket 15 secondes, connexion/greeting 10 secondes. Une suppression/déplacement ou un changement UIDVALIDITY rend l'ancienne référence indisponible. Le nouveau dossier/UID constitue une nouvelle référence, sans transfert automatique de contexte.

Stockage minimal borné : corps texte maximal 32 000 caractères et pièces jointes chiffrés, métadonnées d'identification ; synchronisation manuelle, aucune copie automatique de boîte entière. Garde à 500 références par connexion avant revue de rétention. Aucune suppression automatique de l'historique ; la politique de conservation réelle reste une décision administrative.

HTML non rendu, images distantes non chargées, source email jamais interprétée comme commande d'utilisateur. Pièces jointes limitées à PDF/texte, au plus 8, 256 KiB chacune et 512 KiB cumulés ; formats dangereux/excédents mis en quarantaine. Téléchargement explicite `application/octet-stream`, attachment, no-store/nosniff et CSP sandbox. Une liste de formats n'est pas une certification antivirus ; pas de preview ni exécution de pièce jointe.

Avant lecture d'un corps, d'un brouillon ou d'une réponse soumise, présence du message recontrôlée auprès du transport et autorité revérifiée. Les listes de métadonnées utilisent le dernier état de synchronisation ; l'ouverture ne se contente pas du cache. Les brouillons persistés sur Mission et les enveloppes soumises sont chiffrés, pour éviter leur exposition via une API générique de Session après révocation. Le navigateur échappe le contenu en texte.

## Approbation et envoi : garanties et limites

1. Le brouillon vit dans la Mission existante, avec connectionId, référence message, identité expéditrice, destinataires, contenu, sélection de pièces jointes, révision et date.
2. Soumettre fige une enveloppe chiffrée et son Message-ID stable dans un registre de livraison. Une contrainte Mission/hash interdit la duplication de la même soumission. Ce registre ne remplace pas le store de brouillons.
3. Le propriétaire relit le contenu exact et approuve ; l'approbation existante est liée au hash du brouillon courant, à l'opération, au propriétaire et au workspace. Toute modification de la réponse, de l'identité, des destinataires, des pièces jointes, de l'autorité ou du contexte invalide la demande. Une réapprobation explicite remplace l'ancien token ; aucun token d'approbation dans localStorage.
4. La consommation atomique de l'approbation, le passage à `processing` et la trace Journal de tentative précèdent SMTP. Deux demandes concurrentes ne peuvent pas franchir cette étape deux fois.
5. Une nouvelle vérification d'autorité est faite avant le passage au transport ; résultat `sent`, `failed` ou `uncertain` conservé avec sa trace Journal. L'état `sent` signifie acceptation SMTP de tous les destinataires, **pas livraison en boîte**. Rejet partiel, timeout ou erreur après transmission potentielle : incertain. Pas de retry automatique du transport.
6. Interruption après engagement : `processing` reste visible avec consigne de réconciliation et interdiction de renvoi. Le token est déjà consommé. Si la persistance finale échoue ou que les droits ont disparu, le serveur retourne incertain ; la tentative durable ne redevient pas envoyable. Une nouvelle soumission/révision ne contourne pas un état `processing`/`uncertain` du même message : réconciliation administrative requise, sans réactivation automatique.

**Aucune transaction atomique PostgreSQL/SMTP n'est revendiquée.** L'étape atomique porte sur l'autorisation et l'engagement de tentative. Une révocation validée avant cet engagement empêche l'envoi ; la vérification supplémentaire réduit l'intervalle avant remise SMTP, mais ne constitue pas une garantie distribuée permettant de rappeler une transmission déjà engagée. La résolution des incertitudes est humaine/fournisseur, sans bouton de renvoi automatique.

Le Journal distingue demande, approbation, tentative et résultat. Il contient IDs, révision et autorité, sans corps, pièce jointe ou credential. Les résultats d'un envoi approuvé sont clos dans `clara_tool_approvals` ; l'incertitude de livraison reste explicitement portée par le registre SMTP, sans autoriser de nouvel essai.

## Interface et endpoints

Dans Clara : sélection explicite de boîte, dossiers autorisés, synchronisation, liste/ouverture, téléchargement, proposition de contact à confirmer, rattachement au Contact/Mission sélectionnés, préparation avec Clara, édition, soumission, revue, approbation propriétaire et envoi. Édition bloquée pendant une opération asynchrone pour empêcher l'écrasement d'une saisie par un résultat tardif. Cockpit : choix de boîte et reprise des états durables. FR/EN/ES/DE/IT.

`GET /api/native/mail` : connexions ; actions `folders`, `messages`, `message`, `attachment`, `draft`, `operations`, `review` avec connectionId explicite. `POST` : `sync`, `createContact`, `bind`, `prepare`, `save`, `submit`, `approve`, `send`, `delegate`, `revokeDelegation`, `revoke`. Champs fermés, JSON borné, cookie/session et même origine pour mutations. Aucune route d'enregistrement de credentials ni d'auto-provisionnement d'identité.

## Migration 016, permissions et retour arrière

Migration additive et réapplicable : métadonnées autorité/délégation, messages chiffrés, curseurs, rattachements et registre des opérations. Réutilisation de `clara_tool_approvals` ; aucun nouveau store métier de Mission/Contact/conversation. L'index d'unicité non Google devient non Google/non IONOS : les autres providers gardent leur unicité ; Google inchangé. Aucun fichier des migrations 012–015 n'est modifié.

Fonction `clara_native_mail_command` SECURITY INVOKER, EXECUTE retiré à PUBLIC. Le rôle applicatif serveur reste une frontière de confiance, pas une protection face à un administrateur SQL compromis. En Production, revue de ses owners, grants explicites et default privileges : SELECT ne suffit pas aux verrous ; INSERT/UPDATE/EXECUTE doivent être accordés seulement aux tables/fonctions nécessaires. Pas d'accès SQL direct depuis le navigateur. Les grants larges du test de rôle n'ont aucune vocation Production.

Avant application réelle : sauvegarde vérifiée, restauration sur copie isolée, inventaire schéma/grants, examen des locks lors de remplacement de l'index, plan d'exécution explicitement approuvé. Aucun backfill des boîtes ou historiques. Retour arrière : réseau IONOS désactivé, revenir au dernier code sécurisé validé ; conserver toutes les métadonnées et tentatives, notamment incertaines ; ne pas recréer un index incompatible avec plusieurs connexions IONOS, ne pas DROP les données, ne pas réactiver une autorité révoquée.

## Recette et certification

Les tests PostgreSQL et navigateur, les commandes exactes, résultats et hashes de logs sont consignés dans le fichier evidence associé. PostgreSQL réel isolé ; providers IMAP/SMTP/OpenAI simulés. Tests des bibliothèques de transport avec réponses contrôlées, aucun socket IONOS réel. La recette navigateur exécute les vrais handlers mail par injection de dépendances à la frontière HTTP/provider, puis les vrais services et SQL ; les autres routes de l'application passent par le serveur Next isolé. Cela distingue cette preuve d'une recette réseau IMAP/SMTP ou IONOS réelle.

À certifier ultérieurement, sur autorisations séparées : propriétaire canonique de chaque boîte et délégations ; paramètres IONOS réels et méthode d'auth ; credentials saisis via un canal administratif sécurisé réutilisant CredentialStore (pas le chat) ; schéma/grants/sauvegarde ; TLS/auth/lecture sur messages désignés ; destinataires/signatures/enveloppe ; un éventuel message de test explicitement autorisé ; réconciliation après résultat incertain ; rétention et supervision. L'existence et les essais manuels des boîtes déclarés par l'utilisateur ne certifient pas le connecteur OS.

Aucune activation support/contact/info, Gmail, Calendar, Brevo, Make, Microsoft ou Stripe ; aucune modification Clara Live. Les signatures IONOS manuelles ne sont pas récupérées automatiquement. Clara OS et Clara Live ne sont pas présentées comme commercialisées.

Production : **NO-GO** jusqu'à ces validations et à une autorisation explicite. Les limites préexistantes lint/Vitest et dépendances sont conservées distinctement des résultats ciblés de ce lot ; aucun test désactivé.

## Résultats de réception

- **10/10 tests IONOS** : neuf tests de parsing/configuration/adapters contrôlés et une recette PostgreSQL couvrant les identités séparées, ACL, contacts, approbations, concurrence réelle de deux connexions SQL, révocation, expiration, pannes, UIDVALIDITY, crash, blocage d'un nouveau brouillon après incertitude, permissions SQL et dump/restauration/réapplication. Zéro ignoré.
- **4/4 recettes navigateur** dans le même environnement : lots 1 et 2, IONOS et runtime natif cinq langues. La recette IONOS exerce les deux boîtes, la délégation Gildas, le refus d'approbation par un administrateur non propriétaire, l'acceptation SMTP simulée Clara, l'incertitude simulée Gildas et l'absence de renvoi après reprise. Aucun fournisseur réel.
- **15/15 non-régressions natives PostgreSQL/autorité/documentaire**, **60/60 contrats et langues**, **4/4 continuité canonique OS↔Live**, dont les 18 contrôles d'ordonnancement/reprise du protocole existant. Groupes susceptibles de se recouvrir ; ne pas les additionner comme couverture unique.
- `npm ci`, build local optimisé webpack avec réponses de fontes locales contrôlées, TypeScript et lint ciblé : réussis. Aucun déploiement généré par ce build.
- Lint global : **10 erreurs, 13 avertissements préexistants**. Vitest historique : **20 tests réussis, 2 tests échoués et 1 suite en échec d'initialisation**, dans les mêmes trois fichiers. Les 21 fichiers diagnostiqués (18 lint + 3 Vitest) sont byte-identiques à `6cb51f8`, preuve dans evidence. Aucune suppression d'assertion.
- Audit npm Production : cinq dépendances déjà présentes signalées (Next critique ; axios, brace-expansion et sharp élevés ; qs modéré), **versions inchangées par ce lot**. Aucun changement de version des packages préexistants dans le lockfile. Ces alertes nécessitent une qualification distincte avant Production ; aucune correction hors périmètre effectuée.

**Décision : GO pour le lot 2 bis en isolation, NO-GO Production et fournisseur réel.** Le réseau demeure désactivé ; les futures opérations de configuration sécurisée, migration, recette IONOS et éventuel envoi réel nécessitent chacune une autorisation explicite. L'absence de certification réelle ne remet pas en cause les preuves isolées, et celles-ci ne permettent pas d'annoncer IONOS opérationnel en Production.

## Compatibilité des installations CI

La première publication `f2c9ae3` a révélé une **régression nouvelle de packaging**, distincte des échecs globaux préexistants : trois jobs Node 22 échouaient à `npm ci`, avant leurs tests, tandis que les trois jobs Node 24 réussissaient, dont les nouvelles recettes IONOS. Reproduction locale avec npm 10.9.4 : `Missing: @swc/helpers@0.5.23 from lock file`.

Correction `3c735a117235c0d2c9cb667bd4ed7827e1125506` : ajout de l'entrée peer optionnelle imbriquée sous next-intl, **11 lignes de lockfile seulement**. Le helper racine et toutes les versions préexistantes sont conservés. Installations `npm ci` réelles réussies avec npm 10 et npm 11 ; aucune option `legacy-peer-deps`, aucun test retiré, aucun workflow aligné artificiellement pour masquer le défaut. Les contrôles GitHub de la PR constituent la preuve distante à consulter au SHA publié ; les résultats locaux et leurs hashes sont dans evidence.

Limites de périmètre : la qualification commerciale V1 du lot 1 reste un brouillon protégé, avec son ancienne route d'envoi fermée. Le parcours d'envoi reçu ici est celui de la réponse email V2 explicitement soumise depuis la messagerie IONOS, pas une réactivation des anciens chemins globaux. Le HTML seul n'est pas rendu ni converti automatiquement ; le texte disponible est utilisé comme source non fiable. L'activation fournisseur et la réconciliation administrative des tentatives incertaines sont des opérations ultérieures à autoriser, pas des boutons fictifs livrés comme opérationnels.
