# Livraison intégrée Clara OS + Clara Live — 25 octobre 2026

## Décision et portée

Deux candidats intégrés sont préparés localement. Aucun push, création de PR, merge GitHub, déploiement, accès fournisseur métier ou changement de base distante n'a été effectué. Les assemblages Git ont lieu exclusivement dans les nouvelles branches locales ; aucune branche source n'est réécrite.

**Protection de publication retrouvée** : les attestations globales « Only build production » pour OS/Live/Live API, l'absence de liaison Git du projet Recette au dernier précontrôle authentifié et les workflows manuels sont documentés dans [publication-protection-evidence.md](publication-protection-evidence.md). Le précédent blocage général fondé sur la seule absence de delivery/* dans les exclusions locales est retiré. Aucun réglage n'est changé ; aucune inspection actuelle Vercel n'est prétendue. Publication GitHub seule, sans merge ni déploiement volontaire, selon le GO conditionnel du propriétaire ; surveillance des métadonnées GitHub après publication.

**Recette technique locale : GO sur les parcours exécutés (250 tests, 4 recettes navigateur). Publication GitHub : protections historiques retrouvées. Ouverture de recette distante : autorisation distincte requise. Production : NO-GO.** Les essais isolés ne certifient ni les fournisseurs réels, ni les bindings des futurs déploiements, ni la restauration Production. Voir les résultats exécutés dans `validation.md` et les réserves ci-dessous.

## A — Provenance et candidats

- OS : `delivery/clara-os-v1-20261025`, base canonique proposée pour la livraison `consolidation/clara-os-clean-base`. Le candidat préservé `e1e1897db674ebe4ca4fe268bf40ca40a08df3ee` contient `b40386f4673c5e7cc26e0d2938c5bef06a2324d5`, `fff3fb2384b88c9830e5f22a29bed1110130b791`, `624fc09`, `b2a3959` et #202 `01e3d253ea435d99462e5f80ba68c9c5e0582986` dans son ascendance. Intégration de #203→#208, #200, #201, #207 et #196→#198 sans remplacer le socle #176→#199→#202.
- Live : `delivery/clara-live-v1-20261025`, base canonique `deploy/clara-live-api`. Départ #334 `b17cf916ae9bf946281165f6a4021a961718ce46`, contenant la chaîne #312→#313→#315→#316→#321→#322→#323→#324→#325→#326→#327→#328→#329→#330→#331→#332→#333→#334. Intégration de #303 et #314→#317→#318. Le HEAD distant de `deploy/clara-live-api` est déjà ancêtre du candidat.
- Les têtes, bases et inclusions exactes des PR sont dans `evidence/os-provenance.json` et `evidence/live-provenance.json`. Toutes les PR sources ouvertes observées restent Draft ; aucune n'a été modifiée.
- Live #320 : les fichiers SVG et le composant de marque existent déjà à l'identique dans la chaîne retenue. Les textes d'accueil et anciennes variantes de Layout ne sont pas réimportés pour éviter de remplacer la navigation plus récente. Écart rédactionnel reporté, pas fonctionnalité abandonnée. L'ancien #319 basé sur main n'est pas fusionné dans le runtime deploy par supposition d'équivalence.
- IONOS V1 `b02b1dd` : introuvable dans les worktrees, refs récupérées et archives accessibles. L'ancien chemin `/workspace/clara-os-ionos-v1` n'est pas présent. Le commit n'est pas résolu dans les objets locaux, ni dans la recherche GitHub effectuée. Ses 117 tests annoncés ne sont pas comptés comme preuve. Le runtime IONOS canonique présent dans #176/#199 et les signatures #207 sont conservés ; aucun remplacement hypothétique n'est écrit.
- 137 preuves historiques comparées à leur manifeste SHA-256 : toutes inchangées (`evidence/historical-preservation.json`). Les anciens checkouts sont préservés.

Les rapports et matrices sont versionnés ; les 137 artefacts historiques bruts ont aussi été archivés séparément et revérifiés. Ils ne sont pas ajoutés à Git sans revue des traces de session.

Les SHA finaux et bundles vérifiés sont indiqués dans le manifeste de livraison externe à ce document, pour éviter une autoréférence du commit documentaire.

## B — Résolutions d'intégration minimales

1. CI OS : union des tests natifs existants, Stage, conversations canoniques et Google sign-in. Aucun test désactivé.
2. Cockpit : conserver le flux mobile reçu et les approbations IONOS visibles, sans réintroduire le positionnement desktop sur mobile.
3. Sélecteur OS : conserver le traitement de session/authentification de #198 et les états mission/contact du correctif P1 ; aucune valeur de contexte par défaut.
4. Transport IONOS : conserver le transport de relève sans méthode SMTP et les gardes Recette IMAP/SMTP aux points d'exécution.
5. Dépendances OS : conserver exactement package.json et package-lock.json du candidat e1e1897 (Next.js 16.4.3, nodemailer 10.1.4, mailparser 3.9.43). La branche Recette plus ancienne ne réintroduit pas Next.js 16.3.8.
6. Live : conserver la résolution explicite du projet depuis la navigation actuelle ; intégrer le contrôle conversationnel #303 sans restaurer un projet stocké implicitement. Conserver la liste de capacités Stage + conversation et l'union des tests CI PDF/voix.
7. Fixture navigateur J1 : déclarer la langue du fournisseur simulé, vérifier le texte signé selon le contrat #207, attendre la fin HTTP et SQL de l'approbation avant navigation, et attendre le chargement Agenda local. Les deux échecs initiaux sont conservés dans validation.md ; aucun transport réel ni retry externe n'est ajouté.

Les différences métier intégrées proviennent des PR sources identifiées ; aucune nouvelle architecture, store, moteur ou fournisseur n'a été créé. Les configurations de sécurité Vercel n'ont pas été changées.

## C — Raccord cognitif et autorité OS ↔ Live

Chemin conservé : contexte conversation/projet Live → `build_project_context` et contrôle de propriété → client OS → événement `clara.unified-core.event.v1` → authentification produit/workspace OS → Core/Brain. Le contrat `clara.document-analysis.v1` reste l'autorité de l'analyse documentaire. Une identité de workspace Live n'est pas substituée silencieusement au workspace propriétaire OS.

L'association conversationnelle utilise `conversation:link`, distincte des droits read/archive/voice. Les tests PostgreSQL + routes HTTP Live + MongoDB du candidat démontrent approbation, concurrence, révocation, perte d'acquittement, reprise en nouveaux processus et restauration locale. Les protections MongoDB de #317 sont conservées. Une association conversationnelle ne donne aucun droit matériel.

Le Stage et les révisions MagicQ réutilisent les décisions OS et la persistance Live. Les preuves historiques de 2D/3D/PDF, CAS, GDTF/MVR et quatre métiers sont conservées dans `docs/reception/` des branches intégrées. Elles ne sont pas présentées comme une nouvelle certification matérielle ou fabricant.

**Limite explicite** : la qualité d'une réponse cognitive réelle, la voix/microphone réelle, le DNS/TLS des callbacks distants et une journée interproduits sur URLs déployées n'ont pas été exécutés dans cette mission. #334 décrit déjà l'absence d'accès fournisseur/gateway lors de sa réception. Ce manque d'accès ne prouve pas une panne du raccord historique.

## D — Fournisseurs et périmètre activable

Voir `acquis.csv` et `fournisseurs.csv`. Les attestations historiques du propriétaire sur Google Workspace/Agenda/Drive et Twilio/ElevenLabs sont conservées comme telles ; leur environnement et SHA ne sont pas connus dans cette mission et elles ne sont pas requalifiées en échec.

- Google : code et contrôles conservés, sources, consentements explicites et confirmations exactes. Aucune nouvelle configuration OAuth demandée sans anomalie démontrée.
- IONOS : cinq identités prévues, délégations révocables, curseurs, brouillons, approbations exactes, reçus et issue SMTP incertaine conservés. La relève autonome reste désactivée et aucun SMTP réel n'est tenté. Ne pas interpréter SMTP accepté comme livraison au destinataire.
- Make/Brevo : scénarios existants 7294540 / 7291299, pas recréés. Les faux succès précédemment corrigés restent corrigés. Le raccord natif complet autorité métier → résultat durable → Journal reste à certifier ; l'interface native garde la capacité indisponible. Cette limite est reportable pour J1 si aucun appel réel n'est activé ; les contacts OS restent utilisables. Notify Team ne doit pas contourner l'approbation d'un courrier.
- Voix : conserver le transport historique ; certifier séparément contexte mission + conversation + Journal + reprise. Aucun appel sortant ou changement ElevenLabs/Twilio.

## E — Blocages limités et risques

1. **Protection GitHub/Vercel de publication : preuve historique retrouvée**. Règle globale Production uniquement et projet Recette non lié à Git au dernier contrôle, détaillés dans publication-protection-evidence.md ; pas de nouvelle configuration demandée. La consultation Vercel actuelle reste inaccessible, ce qui ne constitue pas une anomalie. Contrôler les événements observables après publication et arrêter en cas de contradiction.
2. **Réception accessible non exécutée** : pas de déploiement autorisé dans cette mission. Après conservation GitHub, faire approuver le SHA exact, l'environnement, les bindings isolés et l'absence de cron/worker à effet externe ; seulement ensuite solliciter un déploiement volontaire distinct. Le workflow historique Recette est manuel, écritures désactivées et épinglé à un ancien SHA : ne pas le présenter comme prêt à déployer le candidat actuel.
3. **Avant Production** : attester les bindings effectifs OS/Live et rôles limités, sauvegarde externe/rétention/PITR et restauration éprouvée avec clés et reçus, puis recette utilisateur et essais fournisseurs individuellement autorisés. Le test de dump/restore local ne certifie pas la sauvegarde Production. Une ancienne restauration après un effet externe peut provoquer des doublons : conserver les reçus et réconcilier avant toute reprise.

Réserves conservées : HTTP 503 historiques, lint global historique, alertes de dépendances (le dossier e1e1897 distingue 3 alertes de développement des anciens relevés de 7 ; runtime audit antérieur nul, pas une nouvelle inspection en ligne). Aucun de ces constats n'est effacé. Les décisions d'exposition restent subordonnées à leur impact sur le périmètre activé. Aucun nouveau P0 applicatif n'est déclaré sans défaut reproduit. Les capacités matérielles, Builder indisponible, autonomie courrier et show ne doivent pas être commercialisées comme reçues.

## F — Livraison et récupération

1. Conserver les deux bundles Git et leur SHA-256 hors de cette instance ; les vérifier et restaurer dans un dépôt vide pour prouver la reproductibilité. La copie locale n'est pas une conservation GitHub.
2. En réutilisant les protections historiques documentées, pousser uniquement les deux branches candidates, vérifier les SHA distants puis créer deux PR Draft avec les descriptions préparées. Ne pas fusionner les PR sources. Vérifier immédiatement les événements GitHub/deployments observables ; si un déploiement apparaît, arrêter et alerter sans tenter un déploiement correctif.
3. Relever les CI du SHA final, sans workflow de déploiement. Les anciennes CI vertes ne valent pas validation du nouveau commit.
4. Autorisation de recette distincte : attester projet/environnement/base/rôle/SHA et garde d'isolation avec le script OS existant (`src/scripts/attest-recette-runtime.mts --source-sha=<SHA_OS_APPROUVÉ>` via `node --import tsx`). Pour Live, attester séparément les bindings du frontend/API, MongoDB et les callbacks ; le script OS ne certifie pas ces paramètres. Aucun secret dans un rapport ou un message. Les gardes côté serveur restent actifs ; l'authentification Google strictement autorisée n'ouvre pas les opérations métier externes.
5. Migrations : appliquer les fichiers complets dans l'ordre de `evidence/migration-manifest.json`, seulement sur la destination autorisée. Il existe deux 028 différents, à conserver tous deux. Relever les objets réellement présents avant de déterminer les migrations manquantes ; ne pas déduire l'état distant du succès local. Les initialisations/DDL requièrent le rôle de migration, jamais une élévation du runtime. Répéter les contrôles de rôle limité sur la cible, pas des GRANT globaux.
6. Déployer uniquement le SHA approuvé par mécanisme manuel revu. Drainage des anciens workers avant toute préparation/exécution Google ; empêcher les crons métier en recette et garder les capacités non certifiées indisponibles.
7. Recette propriétaire avec deux projets : contexte explicite, mission, document, conversation, Journal, refresh/reconnexion ; Live projet/préparation, quatre métiers, patch, Stage, export. Aucun show. Puis essais fournisseurs ci-dessous après accords individuels.
8. Production : proposition séparée après levée des P0. Retour arrière applicatif vers le précédent SHA compatible avec le schéma additif ; ne pas supprimer les migrations, historiques, reçus ou approbations. Une correction de données nécessite une restauration isolée vérifiée et une réconciliation des effets externes avant bascule, pas un retour aveugle sur une vieille branche Neon.

## G — Essais réels minimaux à autoriser séparément

| Fournisseur | Opération minimale | Effet / autorisation / preuve |
|---|---|---|
| Google | Lire un événement et un document explicitement autorisés | Lecture externe ; accord sur compte/ressource/projet, conserver identifiants de résultat et Journal, pas de mutation |
| IONOS IMAP | Relever une seule boîte et un dossier de test | Lecture réseau et écriture locale des curseurs ; accord sur boîte, aucun marquage/suppression/SMTP ; vérifier déduplication |
| IONOS brouillon | Préparer puis approuver un destinataire de test exact | Aucun envoi ; conserver snapshot expéditeur/destinataires/version/opération ; toute modification invalide l'approbation |
| Make/Brevo | Un contact de test autorisé, scénario 7294540 | Création/mise à jour externe : accord spécifique nécessaire après certification du raccord natif durable ; pas de notification ni campagne |
| Twilio/ElevenLabs | Un échange vocal convenu | Coût fournisseur et voix réelle : accord séparé sur numéro, durée, identité et contexte ; arrêt immédiat, preuve Journal distincte du transport |
| OS↔Live cognitif | Une question sur une fiche synthétique autorisée | Appel modèle externe : accord et budget ; sources, résultat et mission/projet à conserver ; aucune commande matérielle |

En cas de timeout après effet possible : marquer incertain, arrêter ; pas de retry automatique. Pour toute opération, observer le reçu fournisseur adéquat, le Journal et le Cockpit sans confondre préparation, approbation, tentative, acceptation et livraison.
