# Voix et texte Clara OS / Live — premier correctif isolé

Date : 15 novembre 2026. Objectif utilisateur : communiquer avec la même Clara par voix et par texte, avec conservation de la conversation et du contexte projet. Aucun Ready, merge, déploiement, changement de fournisseur ou appel payant autorisé dans cette passe.

## Références réellement contrôlées

- OS : `delivery/clara-os-v1-20261025`, **9ea289efd039ba396fb146dfbd257efeec733a6a**. Le déploiement Vercel Production `dpl_FqVzsmq3Xie86KJc8Ww2Zg99ZD5U` est READY et son `githubCommitSha` correspond. `main` est plus ancien et n'a pas été utilisé comme base.
- Checkout isolé : `/workspace/os-voice-20261115`, branche `fix/voice-text-continuity-20261115`. Autres branches et worktrees préservés.
- Live : branche de livraison `deploy/clara-live-api`, **e4c7fe209db914dc7e65595f6c58ad0ed2659154**. Les fichiers de délégation et les quatre tests audités correspondent exactement à cette référence. Aucun fichier Live modifié.
- OS #227 reste Draft et suspendue ; #228 reste Draft. Les adaptateurs expérimentaux de #228 ne sont pas un raccordement fournisseur opérationnel et n'ont pas été activés.

## Défaut démontré et correction

Le cockpit OS monte déjà `src/components/cockpit/widgets/voice/ClaraVoiceWidget.tsx` avec une sélection native. En revanche, `src/app/clara/page.tsx` remplaçait systématiquement la voix par un message d'indisponibilité dès que le contexte était natif. Un utilisateur pouvait donc retrouver son dialogue textuel mais pas le contrôle vocal dans cette page, indépendamment de sa configuration ElevenLabs.

La correction monte **ce même composant existant** à côté du chat. La portée transmise au navigateur contient seulement `workspaceId`, `clientId`, `projectId`, `sessionId`, jamais l'acteur, le principal ou ses données d'authentification. Voix et texte utilisent la même clé de session. Une conversation non certifiée conserve le bouton désactivé, sans repli vers l'ancien agent autonome.

Le hook, les routes STT/TTS, le Brain, les permissions et les writers ne changent pas. Aucun nouveau composant ni moteur. Les libellés FR/EN/ES/DE/IT du composant natif existant sont réutilisés.

Fichiers applicatifs : **`src/app/clara/page.tsx` uniquement**. Autres fichiers : test de page, extension opt-in de la recette navigateur existante, exclusion AntiPreview de cette seule branche dans `vercel.json`, présent rapport et journaux.

## Chaîne réutilisée et garanties

`ClaraVoiceWidget` → `useClaraRuntimeVoice` → `/api/voice/transcribe` → `/api/clara/chat` → historique natif → `/api/voice/speak` → lecture audio → reprise de l'écoute.

- Démarrage explicite ; le micro n'est pas ouvert par le rendu de la page.
- Même opération de conversation et même historique que le texte ; aucune seconde cognition ElevenLabs ajoutée.
- STT/TTS : autorisation OS native, droit opérateur `connections:manage`, projet autorisé et fil certifié. Revalidation existante et arrêt en cas de révocation conservés.
- La synthèse native reçoit un `messageId` appartenant au fil autorisé ; aucun texte arbitraire de navigateur n'est ajouté à cette route.
- Aucun droit matériel, envoi de show, autorisation étendue ou écriture de préparation ajouté.

## Tests réellement exécutés

| Contrôle | Résultat | Preuve |
|---|---|---|
| Nouveau test de page sur la base, avant correction | 2 PASS / 3 FAIL : absence du composant natif | `logs/page-before.log` |
| Test de page + native-voice + voice-route-security + historical-cockpit et sa dépendance agenda | **31 PASS / 0 FAIL** | `logs/voice-unit.log` |
| Primitives de délégation Live, quatre fichiers copiés exactement depuis la branche de livraison, sans conftest métier | **42 PASS / 0 FAIL** ; doubles de stockage | `logs/live-voice-primitives.log` |
| TypeScript complet, `--noEmit --incremental false` | **PASS** à 2048 MiB ; premier essai 1536 MiB arrêté par la limite de heap | `logs/typecheck.log`, `logs/typecheck-1536-oom.log`, `checks.json` |
| ESLint : page, nouveau test, recette navigateur adaptée | **PASS** | `logs/lint.log` |
| Syntaxe Node de la recette et `git diff --check` | **PASS** | `checks.json` |
| PostgreSQL jetable, initialisation par la fixture existante | PASS initialisation seulement ; pas une réception de conversation persistée | `logs/postgres-fixture.log` |
| Recette navigateur voix/texte et captures | **NON EXÉCUTÉE** : préchauffage de l'application interrompu pour manque de ressources | `logs/dev-preflight.json`, `logs/native-app.log` |
| Build standard Production | **NON EXÉCUTÉ / NON VALIDÉ** : accès Google Fonts refusé par le proxy, ressources insuffisantes constatées en développement | `checks.json` |
| Fournisseurs ElevenLabs / OpenAI réels et iPhone/Safari réel | **NON EXÉCUTÉS** | Aucun appel ni dépense fournisseur dans cette passe |

Les nouveaux tests de page vérifient la portée exacte, l'absence du principal dans les props, la même clé voix/texte, le changement de session, le refus avant chargement et le maintien du verrou sur fil non certifié. Les 31 tests OS emploient des fournisseurs/stockages simulés : ils ne constituent pas une réception audio ni une preuve de révocation sur PostgreSQL réel.

La recette navigateur existante est préparée pour `NATIVE_VOICE_ENTRY=clara` (par défaut, son parcours cockpit reste inchangé). Elle ajoute la continuité voix → saisie textuelle → voix → rechargement dans le même historique SQL. Cette extension est validée syntaxiquement et par lint, **pas exécutée** dans cet environnement. Les exigences existantes de reprise, non-duplication, arrêt du micro/audio et refus d'accès n'ont pas été retirées.

## Blocage environnemental, sans faux PASS

L'application Next en développement a répondu HTTP 200 à `/clara` **sans session authentifiée** ; cela ne prouve pas l'ouverture d'une conversation. Next a utilisé son repli de police natif après le refus de téléchargement de Geist/Geist Mono. Aucun téléchargement de police fictif n'a été injecté, aucun fichier de police ni configuration Next modifié.

Pendant le préchauffage suivant, il ne restait que 11 MiB sur le disque ; la consommation cgroup approchait 8,3 Go pour une limite de 8 Gio. Arrêt des processus app/proxy créés pour cette passe et du seul conteneur PostgreSQL jetable créé, sans réseau ni volume persistant. Seule la sortie `.next` générée dans ce nouveau worktree a été supprimée. Aucun volume, sauvegarde, clé de chiffrement ni donnée existante supprimé. L'espace a été libéré après la fermeture des processus. Aucun essai navigateur supplémentaire lancé à l'aveugle.

Prérequis de reprise : environnement disposant réellement de marge disque/mémoire pour Next + Chromium + PostgreSQL et accès aux polices nécessaires au build. Reprendre la recette existante, sans réécriture ni nouvelle infrastructure cloud.

## Configuration fournisseur — présence uniquement

Inspection Vercel en lecture seule, sans déchiffrement ni utilisation des valeurs : `ELEVENLABS_API_KEY` et `ELEVENLABS_VOICE_ID` sont déclarées pour Production. Les paramètres de l'ancien agent conversationnel sont seulement présents sur une ancienne branche Preview. Le pipeline natif actuel n'exige pas cet agent.

Cette présence ne certifie ni validité de clé, abonnement, modèle, voix, quota, accès réseau ni fonctionnement sonore. Aucun secret n'a été copié vers l'environnement local, aucun paramètre distant modifié. L'utilisation d'une configuration Production pour un test isolé n'est pas présumée autorisée.

## Clara Live — dépendance d'autorité encore manquante

Le dialogue Live reste textuel (`frontend/src/context/ClaraConversationContext.jsx`, `ClaraConversation.jsx`). Les primitives `backend/voice_delegation_contract.py`, `voice_delegation_protocol.py`, `voice_delegation_mongo.py` et `voice_session_revocation.py` ne sont raccordées à aucun endpoint vocal métier.

Le routeur `backend/conversation_links.py` permet consentement, vérification et arrêt d'une **association `conversation:link`**. Il ne délivre pas `voice:conversation` et refuse de certifier l'arrêt lorsqu'une session vocale n'a pas d'acquittement vérifié. Le jeton produit OS/Live n'est pas une identité utilisateur OS ; un JWT Live ne constitue pas la session OS requise par les routes vocales natives. Réutiliser ce lien comme un droit vocal implicite serait un contournement.

### Raccord minimal à qualifier avant activation Live

1. Partir des associations canoniques déjà consenties et vérifier côté serveur leurs identités OS/Live, workspace/client/projet et fils de conversation. Aucune correspondance par nom, email ou dernier projet.
2. Raccorder émission et consommation de la délégation vocale existante avec une autorisation explicite `voice:conversation`, durée bornée, langue, anti-rejeu et refus durable après révocation. Ne pas remplacer ce consentement par le jeton produit.
3. Faire transiter chaque transcription par le dialogue et le writer durables existants ; restituer uniquement la réponse attestée du bon tour. Les identités de message OS et Live doivent être résolues et contrôlées, jamais assimilées arbitrairement.
4. Arrêt effectif des pistes micro, de la lecture et des requêtes à la révocation, au changement de projet et à la fermeture ; aucune reprise automatique d'une opération d'issue inconnue.
5. Recette bilatérale HTTP/PostgreSQL/MongoDB isolée : bon fil, interprojets/utilisateurs, expiration, rejeu, révocation, indisponibilité et reprise, puis essai fournisseur réel plafonné autorisé et réception Safari iPhone.

Ce raccord n'est **pas implémenté** par ce correctif UI. Aucune route, nouveau fournisseur, nouvel agent, autorité ou writer parallèle créé. L'ancien SDK conversationnel et ses expérimentations Custom LLM ne sont pas activés.

## Décision et prochaine réception

- Correctif UI OS : **PASS tests locaux et TypeScript**, prêt à examiner en Draft, pas réceptionné en navigateur.
- Conversation vocale OS réelle : **NON RÉCEPTIONNÉE**, fournisseur et appareil réels non testés.
- Voix Live : **BLOCKED** par le raccord d'autorité décrit ci-dessus, aucune fausse commande microphone ajoutée.
- Ready / fusion / Preview / Production : **NO-GO**. Pas d'Actions payante ni d'appel cognitif/audio réel. Aucun changement aux ateliers Live, Stage Model ou connecteurs matériels.

Les fichiers et empreintes dans `tested-files.sha256` permettent d'identifier le correctif testé. La configuration AntiPreview exclut uniquement `fix/voice-text-continuity-20261115` ; tout éventuel commit est marqué `[skip ci]`. Les autres branches et les PR #227/#228/#277/#356 sont conservées.
