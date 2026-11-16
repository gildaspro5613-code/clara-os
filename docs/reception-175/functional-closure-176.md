# Lot de fermeture fonctionnelle — PR #176

> État historique : le raccordement Agenda/Drive autorisé ensuite est documenté dans [la réception Google finale](google-agenda-drive-final.md). Les preuves de ce lot restent conservées.

Référence de départ obligatoire : `a16497fce1e780bf9109a360dc75cf00fd56b6f0`. Branche `fix/os-operational-reception-175`. PR existante conservée Draft. Ce dossier complète la réception finale, sans refaire l'inventaire des 419 contrôles ni rouvrir les lots déjà reçus.

Commit de corrections : `4e5d5c3f9c286b5402feb5b8ff48acd449af6984`. Les commits de documentation ultérieurs ne changent pas ce code.

## Décision

**NO-GO pour le déploiement du périmètre complet demandé.** Les corrections emails et contacts sont soumises à la campagne commune décrite dans les preuves. Agenda et les écritures Drive restent fermés : leurs autorités/consentements nécessaires ne figurent pas dans les contrats natifs actuels. La configuration et les opérations Production restent également non certifiées. Une CI verte ne vaut pas validation fournisseur.

## Corrections et réutilisation

### Emails → Documents

- Montage du **même NativeMailPanel** dans Documents, maintien dans Clara et des références Cockpit. Aucun message déplacé/copié, nouvelle boîte, nouvelle identité ou nouveau système documentaire.
- Extension de `NativeMail.list` et du GET existant `/api/native/mail?action=messages&connectionId=…&beforeId=…`. Réponse compatible `{success,messages,nextCursor}` ; page de 50, 51e ligne utilisée uniquement pour détecter la suite. Le curseur est un identifiant opaque de message, jamais un secret ni une preuve d'autorisation. Il ne donne aucun droit supplémentaire.
- Ordre déterministe par ID immuable décroissant, **pas une promesse de tri chronologique**. Les mises à jour de timestamps pendant une synchronisation ne déplacent pas les messages entre pages. Un nouvel arrivage se retrouve après actualisation ; la navigation n'est pas une photographie transactionnelle de toute la boîte.
- Les ACL utilisateur/workspace/client/projet, l'autorité courante de la boîte et la révocation sont répétées à chaque page. Les non-rattachés sont visibles uniquement au propriétaire autorisé de la boîte ; une délégation ne donne accès qu'aux messages du projet explicitement rattachés. Un rattachement révoqué n'est pas réinterprété comme message non attribué.
- Corps et pièces jointes restent dans le stockage chiffré existant. L'ouverture et le téléchargement gardent leurs contrôles existants, y compris disponibilité IMAP. La consultation hors ligne sans revalidation fournisseur **n'est pas certifiée**. Aucune recherche globale prétendument exhaustive ajoutée.
- La limite de rétention existante de **500 messages synchronisés par connexion**, le plafond par lot et les limites de taille sont conservés. Aucune purge n'est introduite. La pagination permet de retrouver tous les messages conservés et actuellement autorisés ; elle ne supprime pas ces limites d'acquisition.

### Contacts

- Réutilisation de ContactsDirectory, `/api/contacts`, `clara_project_intake_inbox`, `clara_acquisition_records`, qualifications/lifecycle existants, attestations canoniques et **commit natif Session/Journal**.
- Création manuelle explicite dans le contexte sélectionné ; identifiant serveur `native-contact:UUID`. Aucun rapprochement par nom/email, contact étranger ou historique sans attestation. Canal interne `contact-reviewed`, validation externe website inchangée.
- Édition des nom/email sur un contact possédé et attesté. Empreinte de version fournie au client, vérifiée à la préparation puis snapshot revérifié **dans la transaction SQL**. Deux écritures concurrentes issues de la même version ne peuvent réussir ensemble. Aucun changement de client/projet ni réaffectation d'historique.
- Les missions et demandes historiques restent liées au même identifiant ; le Journal enregistre l'opération, pas les corps email ni des secrets. Le nouveau contact se sélectionne explicitement dans Clara et le parcours Mission existant.
- **Limite volontaire** : contact ayant déjà un brouillon commercial ou un brouillon IONOS rattaché → HTTP 409 `CONTACT_DRAFT_REVIEW_REQUIRED`. Aucun destinataire figé ni brouillon n'est modifié ou supprimé silencieusement. La revue/mise à jour du destinataire d'un brouillon existant ne fait pas partie de cette fermeture minimale ; ce cas ne doit pas être présenté comme une édition disponible.
- La création n'infère pas de dédoublonnage entre deux demandes manuelles distinctes ; aucun rapprochement automatique par email. Aucun envoi commercial.

### Indisponibilités explicites

- Téléphonie : indication d'indisponibilité et bouton d'appel désactivé, y compris après saisie d'un numéro. Les autorisations serveur voix existantes ne sont pas élargies ; pas de certification du transport téléphonique.
- Automatisations : avertissement explicite d'exécution indisponible ; les liens restent des navigations vers des pages de travail, sans exécution automatique. Make/Brevo ne sont pas activés.
- Drive : état de lecture seule explicite, import/création/déplacement restent désactivés. Aucun déverrouillage du Hero/Agenda ni refonte du Cockpit.

## Blocages contractuels précis — travail arrêté conformément au périmètre

| Écart | Preuve dans le code | Contrat/droit manquant | Suite minimale à autoriser séparément |
|---|---|---|---|
| Agenda | `src/app/api/calendar/route.ts` appelle `nativeOperationFence` ; la fonction renvoie 503 même avec session native valide. Le code legacy cible `calendarId: primary`. | Pas d'autorité attestée identifiant connexion Google + calendrier + utilisateur/workspace/client/projet ; pas de consentement Calendar dans le flux natif. | Définir la sélection explicite du calendrier et sa délégation révocable, le périmètre lecture/écriture voulu et son consentement OAuth ; réutiliser Google authority/CredentialStore, sans rouvrir le chargeur global. Aucune opération réelle ici. |
| Import/écriture Drive | `src/app/api/connections/google/connect/route.ts` et migration 015 : scopes `openid`, `drive.readonly`. `NativeDocuments.list` renvoie readOnly ; POST Documents n'accepte que inspect/bind/read. | Aucun consentement d'écriture ni contrat natif d'autorité/version/confirmation sur une destination de création ou déplacement ; droits de lecture ≠ droits de mutation. | Définir destinations explicitement autorisées et opérations, consentement minimal adapté, confirmations et comportement d'issue incertaine ; étendre les contrats existants dans un chantier autorisé. Aucun scope ou secret modifié. |

Fichiers concernés par une éventuelle intervention ultérieure :

- Agenda : `src/app/api/calendar/route.ts`, `src/lib/connectors/google/calendar/list-events.ts`, le flux OAuth natif `src/app/api/connections/google/connect/route.ts`, `src/lib/native/google-authority.ts` et le contrat SQL 015 à étendre additivement. La sélection/délégation Calendar n'existe pas dans l'autorité documentaire actuelle ; ne pas utiliser `primary` comme preuve d'appartenance. Pour une recette en lecture seule, étudier `calendar.events.readonly` ; toute mutation exige une autorisation distincte (`calendar.events`) et sa gouvernance. Aucun de ces scopes n'est demandé ici.
- Drive : `src/app/api/documents/route.ts`, `src/lib/native/documents.ts`, `src/lib/native/google-authority.ts`, le flux OAuth natif et les méthodes existantes de `src/lib/connectors/internal/google/drive/`. Choisir explicitement entre fichiers créés/ouverts par l'application (`drive.file`, si suffisant pour le périmètre approuvé) et documents existants qui exigeraient d'autres droits. Vérifier les capacités effectives Google et la version, attester la destination, journaliser la mutation et traiter l'acquittement incertain sans renvoi automatique. Aucune permission d'écriture ne découle d'une attestation de lecture.

Leur activation ne se réduit donc pas à retirer une condition ou changer un bouton. Aucun contrat Live ni dépôt Clara Live n'est modifié.

## Migrations additives et retour arrière

- **012–017 inchangées byte à byte** depuis la base imposée ; migration 014 préservée.
- **018_native_mail_pagination.sql** : remplacement de la seule fonction mail existante ; branche `messages` étendue. Toutes les branches d'autorité, de délégation, de relecture, d'approbation et d'envoi restent identiques à 016.
- **019_native_contact_editing.sql** : remplacement de la fonction runtime existante ; métadonnée de capacité contact et extension du commit acquisition uniquement. Les validations 017, historique durable, idempotence chat, missions et brouillons existants restent identiques.
- Aucun nouveau store/table, réattribution historique, backfill, suppression ni changement de rôle/configuration. Fonctions `SECURITY INVOKER`, droits PUBLIC révoqués. Les anciens clients restent compatibles ; la nouvelle application refuse explicitement l'absence de migration au lieu de prétendre avoir enregistré/paginé.
- Dépendances : 012→017 déjà présentes ; appliquer **018 puis 019** après autorisation et sauvegarde vérifiée. Ne pas rejouer 016 après 018, ni 017 après 019 : ces anciennes définitions remplaceraient les extensions. Réapplication 018/019 testée sur copie jetable.
- Rôle de migration : propriété des fonctions remplacées et privilèges DDL nécessaires dans le schéma. Rôle applicatif : droits natifs existants, plus vérification explicite d'UPDATE sur `clara_project_intake_inbox.intake/updated_at`, UPDATE des acquisitions et DML des attestations/Journal ; aucune élévation effectuée. Les exigences de verrouillage décrites au lot 5A restent applicables.
- Sauvegarde/restauration testées **localement uniquement** avec pg_dump/psql et empreinte des lignes messages, acquisitions, attestations et Journal. Aucune sauvegarde/migration Production exécutée.
- Retour applicatif à a16497f possible en conservant les fonctions additives et toutes les données ; les anciennes interfaces ne proposent plus création/édition/pagination étendue. Pas de DROP ni rollback de données. Restaurer la copie sauvegardée seulement après décision administrative ciblée ; conserver reçus et historiques.

## Campagne commune et qualification

Voir `functional-closure-evidence.json` pour les commandes, résultats, référence testée et limites ; matrice ciblée dans `functional-closure-matrix.csv`. Les preuves brutes sont archivées séparément. Aucun test désactivé. Deux sélecteurs de la nouvelle recette ont été corrigés (nom présent dans une option et une fiche, puis portée du filtre de lignes) ; les assertions de visibilité, de compte et de persistance restent exécutées.

- **43/43 tests natifs PostgreSQL, 0 ignoré** ; **45/45 tests de contrats/langues/voix/OS↔Live**. Tests natifs réels PostgreSQL : autorités, runtime, commercial, documents/PDF/Core/Brain, OAuth, IONOS, conversations, plus fermeture. Fournisseurs simulés seulement.
- Nouveaux contrôles : 101 messages sur plusieurs pages, reprise du curseur, synchro concurrente, inter-utilisateurs/clients/projets, délégation/révocation ; contacts persistants, concurrence réelle, refus historique non attribué et brouillon protégé ; réapplication/restauration et refus sur anciennes fonctions.
- Navigateur local : **5 recettes existantes + 1 fermeture + 1 Cockpit réussies** (les deux dernières sur le code final ; la CI commune recertifie toutes les recettes sur le SHA exact). Les cinq parcours natifs existants, le nouveau parcours Documents/Contacts et le parcours disponibilité/reprise Cockpit. Aucune certification réelle de sign-in Google, IMAP, SMTP, OpenAI, Neon ou Vercel.
- TypeScript, lint ciblé, build optimisé local (polices fournies localement avec vérification TLS conservée) ; pas de déploiement.
- Contrôles globaux séparés : ESLint **9 erreurs / 12 avertissements** dans les sources préexistantes restantes (avant : 10/13 ; le défaut d'effet ContactsDirectory est corrigé) ; Vitest **20 réussis, 2 assertions en échec et 1 erreur de collecte**, mêmes trois fichiers déjà qualifiés. Aucun échec global n'est transformé en réussite ciblée.

## Contrôles GitHub

Les résultats définitifs sont accessibles dans les contrôles de la PR #176 et dans les métadonnées du dossier de preuves. Au moment de préparer ce document : cinq workflows réussis, campagne native finale en cours. Ce document ne déclare pas cette campagne verte par anticipation. Les commits de documentation suivants ne modifient pas le code `4e5d5c3` testé.

Vercel a renvoyé « Canceled by Ignored Build Step » ; aucun déploiement GitHub recensé pour le commit de corrections. Aucun réglage Vercel modifié.

## Avant toute Production

1. Revue des changements et migrations 018/019, rôles et privilèges effectifs ; vérification de la cible Neon↔Vercel sans afficher les DSN.
2. Autorisation séparée de sauvegarde et restauration sur copie, preuve de restauration, fenêtre/rétention et retour arrière acceptés.
3. Décision sur Agenda/écritures Drive et sur la limite de revue des contacts avec brouillons ; sinon périmètre formellement réduit et indisponibilités maintenues.
4. Certification réelle autorisée des connexions, identités et délégations nécessaires ; aucun email/appel sans approbation explicite.
5. Autorisations explicites avant migration, merge ou déploiement Production. PR #176 Draft ; aucune Preview Vercel autorisée.
