# Clara OS / Live — voix et texte, réception isolée

15 novembre 2026. But : parler et écrire à Clara dans le même contexte autorisé, retrouver ses messages et pouvoir interrompre la voix. Aucun Ready, merge, déploiement, changement distant, matériel ou fournisseur payant dans cette passe.

## Références et périmètre

- OS : base Production réellement contrôlée `delivery/clara-os-v1-20261025`, **9ea289efd039ba396fb146dfbd257efeec733a6a**, Vercel `dpl_FqVzsmq3Xie86KJc8Ww2Zg99ZD5U` READY. `main` plus ancien n'a pas servi de base.
- Branche `fix/voice-text-continuity-20261115`, **Draft #281 existante**. Premier commit `44b861dfb08cd9d7c69dfa31f544a22405ba336a`, puis consolidation de cette même PR. Les branches #227/#228 et les autres chantiers restent intacts.
- Live : base Production **e4c7fe209db914dc7e65595f6c58ad0ed2659154**, branche indépendante `fix/live-voice-text-continuity-20261115`. Son rapport et sa PR contiennent les preuves Live/Mongo ; ce dépôt OS ne reçoit aucun writer Live.

## Corrections confirmées

| Constat | Correction | Preuve |
|---|---|---|
| `/clara` désactivait la voix dans tout contexte natif alors que le cockpit possède déjà le composant autorisé. | Montage du **même** `ClaraVoiceWidget` avec les seuls workspace/client/projet/session certifiés. | Tests de page et recette Next/Chromium/PostgreSQL. Aucun principal ou digest dans les props navigateur. |
| Chat et voix étaient des éléments frères portant la même clé React. | Clés React distinctes ; même identifiant réel de conversation. | Test de changement de session et navigateur sans erreur de clés/hydratation. |
| Live ne raccordait pas ses délégations audio au service OS. | Trois routes produit audio utilisant le registre de capacités existant, le fournisseur ElevenLabs existant et une preuve Live courante. | Six tests de sécurité produit, positif HTTP bilatéral Live et refus 401 sur les trois vraies routes compilées par Next. |
| Le STT natif et le service produit auraient autrement dupliqué la logique fournisseur. | Extraction de l'opération Scribe existante, réutilisation du cycle audio borné et du même moteur TTS. | Non-régression des routes natives, du secret fournisseur et de la révocation, puis navigateur natif réel. |
| La recette HTTPS locale ne transmettait pas les upgrades HMR, empêchant la réception en mode développement. | Proxy **de test** : transmission opaque des seuls chemins HMR locaux permis ; aucun retry et aucun relâchement de frontière applicative. | Six tests du proxy et hydratation de l'application réelle. |

Aucun Brain, modèle de réponse, writer, schéma Stage, autorisation native ou connecteur matériel n'est changé.

## Chaînes réellement raccordées

**OS natif** : widget existant → hook existant → `/api/voice/transcribe` → `/api/clara/chat` → historique PostgreSQL natif → `/api/voice/speak` lié au message exact → lecture HTMLAudio → écoute suivante. Le fournisseur audio ne devient jamais l'autorité cognitive.

**Live** : contrôle micro dans sa conversation existante → backend Live authentifié → OS `voice:conversation` → callback Live vérifiant la délégation signée et sa consommation atomique → STT → **envoi textuel Live actuel** → message Mongo complet attesté → même service audio OS → navigateur. Aucun historique parallèle ; aucun accès natif OS accordé par un token produit. `conversation:link` reste une capacité distincte et n'autorise pas la voix.

Le service produit est fermé par défaut : produit `clara-live` authentifié, capacité vocale explicitement configurée, workspace serveur, callback autorisé, configuration ElevenLabs et délégation courante sont tous nécessaires. Les callbacks revérifient utilisateur/projet/session, empreinte du contenu, TTL et reçu avant, pendant (500 ms) et après le fournisseur. Le résultat est encore vérifié avant restitution. Aucune permission distante n'a été attribuée ici.

Les routes natives conservent `connections:manage`, la certification du fil, l'isolation et la révocation PostgreSQL existantes. Une réponse d'un autre fil, un texte arbitraire du navigateur, un fournisseur interrompu ou une issue incertaine ne déclenchent ni lecture ni relance automatique. Les validations métier restent humaines.

## Résultats exécutés

| Contrôle | Résultat | Preuve |
|---|---|---|
| Tests de page, voix native, routes fournisseur, historique et produit ; proxy HTTP/HMR | **43 PASS, 0 FAIL, 0 ignoré** | `logs/final-voice-tests.log` |
| TypeScript complet | **PASS** avec heap 2048 MiB | `logs/typescript-shared-audio.log` ; première tentative à 1536 MiB OOM conservée, aucune modification du code pour la masquer |
| ESLint ciblé des fichiers applicatifs | **PASS** | `logs/eslint-voice.log` |
| Chromium / Next.js 16.4.3 Turbopack / HTTPS / PostgreSQL réels | **2 PASS, 0 FAIL** | `logs/browser-clara.log`, `browser-recheck-result.json` |
| Trois routes produit compilées par Next, sans autorité produit | **401 attendu pour chacune**, aucun fournisseur | `logs/product-next-route-refusals.json` |
| Live : handlers et Mongo réels, primitives existantes | **59 PASS** | Rapport de la PR Live, pas une simulation de stockage |
| Live : UI, cinq cockpits et viewer | **86 PASS** et build optimisé **PASS** | Rapport Live ; le test viewer JSDOM ne certifie pas WebGL |
| Live : navigateur compilé / HTTPS bilatéral / reprise des services | **PASS** | Rapport et captures de la PR Live |
| Build Next Production complet | **NON VALIDÉ ici** | Accès Google Fonts bloqué ; aucun faux téléchargement, remplacement de police ou changement de configuration |
| Fournisseur audio/cognitif réel, microphone humain, Safari/iPhone physique | **NON EXÉCUTÉ** | Aucun accès fournisseur de réception autorisé employé |
| GitHub Actions | **NON DÉCLENCHÉ** | Budget préservé, commits `[skip ci]` |

Le navigateur natif vérifie trois tours vocaux sur une activation micro, le temps réel de lecture d'un HTMLAudioElement, interruption pendant écoute/fournisseur/lecture, historique SQL et identifiant du message synthétisé, réponse perdue après commit puis reprise sans nouveau STT, révocation projet et session, et texte → voix → reload avec le même historique. Le second scénario vérifie les lectures SQL retardées, une seule vérification d'autorité en cours, le timeout inchangé, le refus du micro et un vrai 403.

Les pistes, MediaRecorder, lecture audio, HTTP et bases sont réels. **Le signal micro et les réponses ElevenLabs/OpenAI sont simulés** : ces tests ne certifient ni transcription humaine, ni timbre de Clara, ni fournisseur réel. La recette est compilée par **Next dev**, avec le fallback de police fourni par Next lorsque Google Fonts est inaccessible ; elle n'est jamais présentée comme un build Production réussi.

## Environnement et preuves

Les journaux d'échecs initiaux sont conservés. Les défauts de harnais ont été identifiés avant reprise : dépendances dupliquées, sorties de test dans le répertoire surveillé par Tailwind, espace disque et résolution relative des externals du cache déplacé. Aucun refus applicatif ni test n'a été enlevé pour obtenir un PASS.

Les dépendances immuables ont été comparées avant déduplication ; seules des copies identiques et des caches de compilateur générés ont été concernés. Les données Mongo jetables propres à cette recette ont été contrôlées puis supprimées pour libérer de l'espace. Aucun volume métier, archive, clé de sauvegarde ou fichier constructeur n'a été supprimé.

La recette native finale utilise le même Next et les mêmes packages, un PostgreSQL `postgres:17-alpine` sans réseau, lecture seule sauf tmpfs nécessaires, et un dossier `.next` généré sur le volume `/tmp` libre. La structure relative `node_modules` du cache et `NODE_PATH` permettent de résoudre les externals réels ; aucun package ou réponse fournisseur n'est substitué pour compiler. Les traces et profils Chromium restent **hors du checkout surveillé**. Les seuls certificats de test sont privés, hors dépôt.

Captures : `captures/desktop.png`, `captures/mobile.png`, `captures/clara-text-voice-history.png`. Elles proviennent du navigateur réel sur données synthétiques. `evidence.sha256` inventorie les preuves et `tested-files.sha256` les fichiers testés.

## Réception réelle restante et décision

**GO pour le raccordement déterministe en isolation. NO-GO pour une certification fournisseur ou une activation Production.**

La présence de `ELEVENLABS_API_KEY` et `ELEVENLABS_VOICE_ID` en Production OS a été constatée par métadonnées seulement : valeurs non lues, validité et timbre non testés. Une réception réelle nécessite un accès fournisseur autorisé en isolation et un budget accepté. Elle devra vérifier une phrase humaine, sa réponse Clara et la voix réellement choisie, puis l'interruption et le retour au texte. Aucun secret ne doit être envoyé dans la conversation ou les preuves publiques.

Live reste vocalement fermé sans capacité produit explicite, callback et index d'intégrité ; aucun de ces réglages Production n'a été modifié. Son contrat impose un projet ; le global reste textuel. L'association des identités ou historiques OS/Live ne se déduit jamais de la seule voix. Les limites de révocation JWT et de taille d'historique existantes restent documentées côté Live. Les documents, paramètres métier et Stage ne sont jamais sauvegardés automatiquement par le contrôle vocal.

Les trois déploiements Production existants sont conservés ; branches vocales exclues dans les fichiers Vercel existants. Une mise à jour de Draft n'est ni Ready, ni merge, ni activation. Les tests ont été ajoutés aux suites existantes sans créer de job CI supplémentaire.

Le journal applicatif Next complet est conservé dans `logs/native-app-recheck.log.gz` ; le fichier `.log` lisible en donne un extrait. Les journaux Git retirent uniquement les espaces de fin de ligne.
