# Incident : Cockpit connaît les missions, Clara n'en reçoit pas le registre

Base exacte : `faee20ce8fda8f9170dde6ea0f414a3eee42eb65` (fusion #220), récupérée depuis GitHub. Branche distincte : `fix/native-mission-consultation-context-20261031`. Aucun changement de Cockpit, d'ACL, de migration, de fournisseur ou de déploiement.

## Cause démontrée et trajet réel

1. Cookie de sélection → `nativeSelectors` → `withNativeScope` → `clara_native_runtime_command` : PostgreSQL vérifie l'identité, l'appartenance, le client/projet, le fil et les autorités des missions. Il retourne les seules missions autorisées de cet utilisateur dans ce client/projet.
2. `src/app/page.tsx` → `loadMissions()` : le Cockpit utilise cette collection request-scoped, sans requête globale.
3. `POST /api/clara/chat` → `nativeChatRequest` → `resolveOperationalContext` → `dispatchEvent` → `Clara.processEvent` → `orchestrate` : le runtime et la mission active sont bien repris. Même sans contact sélectionné, **dispatchEvent réinjecte déjà workspace, utilisateur, session, client et projet**. Les traces montrent ces identifiants dans les deux prompts : aucune perte d'identité démontrée.
4. `buildBrainContext` → **`buildBrainSources` n'exposait pas la collection native des missions**. Il ne traitait que les documents et certains fournisseurs. La mission active isolée pouvait être transmise, pas le registre pourtant déjà chargé par le même contrôle d'autorité.
5. `reasoning` puis `composeClaraResponseWithProposal` recevaient les sources sans ce registre. La consultation arrivait au cycle conversationnel, **sans raccord à la lecture des missions disponible côté serveur**. L'absence d'outil du modèle était ainsi confondue avec l'absence de données métier déjà lisibles.

Le fichier `brain-source-registry.ts` a le même blob Git `ed5df06044f899472eafc7b78dea1fe257703a78` dans adff319 et faee20ce. Les réceptions antérieures prouvaient notamment la mission active, les commandes, la persistance et l'isolation ; elles ne vérifiaient pas la transmission d'un registre de plusieurs missions au rédacteur. Le diagnostic ne remet pas en cause ces acquis et ne reconstruit pas leur runtime.

## Correction minimale

- `brain-source-registry.ts` raccorde les consultations non mutantes au store natif existant, sous la source `native-missions`. Les commandes explicites conservent leur parcours ; aucun outil n'est ajouté au modèle.
- `cognitive-scope.ts` projette uniquement identifiant, titre, objectif, statut, progression et prochaine action ; contexte canonique et mission sélectionnée explicites. Maximum 100 missions, compteur et indicateur de liste partielle ; jamais une prétendue liste globale de l'organisation. Les valeurs métier restent des données non fiables, pas des instructions.
- `reasoning.ts` et `response-composer.ts` précisent la nature des sources et le fait que le registre est déjà lu par le serveur ; un ancien échange ne prime pas sur l'instantané autorisé courant.
- `scoped-context.ts` et `chat.ts` réutilisent le hook de revérification et les reçus durables existants. Une empreinte non sensible est ajoutée à l'enveloppe interne du reçu, sans nouvelle table ni contrat d'autorisation. Une liste modifiée/révoquée avant persistance ou lors d'un rejeu est refusée (`NATIVE_MISSION_CONTEXT_CHANGED`, 409), sans régénération automatique. Les anciens reçus restent compatibles.
- Les historiques déjà autorisés sont conservés ; une révocation ne supprime pas rétroactivement les messages anciens. Une nouvelle réponse utilise le registre courant. Aucune promesse de suppression d'une donnée déjà transmise n'est faite.

## Preuve avant / après

| Contrôle | Avant, SHA Production | Après correctif |
|---|---|---|
| Projection exacte du store utilisé par Cockpit | Deux missions autorisées : 44 % et 17 % | Identique |
| Identifiants canoniques dans Brain / rédacteur | Présents | Présents |
| Registre natif dans les deux prompts | Absent | Deux missions, mêmes identifiants que le store Cockpit |
| Réponse du rédacteur de test | Diagnostic simulé : registre absent | « Inventorier accès vérifiés — 44 % », « Préparer le dossier autorisé — 17 % » |
| Lignes missions, données et timestamps | Inchangés pendant consultation | Inchangés sur tous les parcours positifs et négatifs |
| Historique et reçu rejoué | Mécanismes existants | Échange durable ; même opération rejouée sans nouveau cycle |

Les fichiers `before.json` et `after.json` contiennent exclusivement des données synthétiques et les entrées réellement reçues par les étapes du runtime. **La lecture native des missions n'est pas simulée** : véritables fonctions SQL, PostgreSQL 17 jetable, contrôles d'autorité et store existants. Le test charge la véritable route POST et exécute tout le cycle Brain/rédacteur/persistance ; seuls les contextes Next de requête/traduction sont fournis par le harness et le transport SQL vise PostgreSQL local.

**Le fournisseur de langage est explicitement simulé** : il reformule uniquement le registre reçu, sans accès à PostgreSQL. Cette preuve établit le défaut de transmission et sa correction, pas la reproduction mot pour mot de la réponse OpenAI de Production. Aucun appel fournisseur réel ni lecture des données Production. La recette HTTPS séparée emploie le vrai serveur Next optimisé, le navigateur et PostgreSQL local ; génération également simulée.

## Contrôles et limites

Voir `validation.txt` : reproduction rouge sur faee20ce, test de correction, non-régressions existantes, lint, TypeScript et build optimisé Webpack (polices locales simulées). Le test ajouté est repris par le glob `operational-recovery*.test.ts` du workflow natif existant ; aucun nouveau workflow.

Refus vérifiés : absence/session invalide, expiration, autre propriétaire, autre workspace/client/projet, appartenance révoquée ; propriétaire B et projet distinct ne voient que leurs missions ; liste vide autorisée sans fallback global ; révocation pendant la génération et lors du rejeu ; absence de création/modification des missions. Les contrôles existants conservent commandes explicites, historique paginé, concurrence, perte d'acquittement et reprise.

**45 tests PASS, 0 FAIL, 0 SKIP ; une recette navigateur HTTPS PASS ; TypeScript, lint ciblé et build optimisé Webpack PASS. GO technique isolé ; réception sémantique réelle du fournisseur encore à faire sous autorisation. Aucun GO de merge ou de déploiement.** Après autorisation de livraison, la vérification Production courte consiste à demander la liste dans le même contexte que le Cockpit, comparer titres/progressions, puis recharger l'historique et confirmer l'absence de mutation des missions. Cette vérification peut créer un échange et son Journal, jamais une nouvelle mission par consultation.

Publication : seule la branche de correctif est publiée, selon les protections historiques Only build production de `docs/delivery-v1-20261025/publication-protection-evidence.md`, sans changement Vercel ni lancement manuel de workflow. La branche de livraison Production reste inchangée. Le statut CI distant n’est pas inféré des tests locaux.
