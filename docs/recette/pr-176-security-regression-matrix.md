# PR #176 — matrice de tests de sécurité Recette (suivi partiel)

**État : contrôles fournisseurs partiellement exécutés en CI ; scénarios d'autorité et E2E non certifiés. NO-GO déploiement / NO-GO Production.**

## Observations de code

- `src/lib/auth/authenticated-workspace-session.ts` : SHA-256 du jeton, session non expirée et non révoquée, appartenance active au workspace.
- `src/lib/auth/canonical-request-authorization.ts` : cookie `clara_auth_session` obligatoire ; autorisation de l'espace et permission.
- `src/lib/native/authority.ts` : périmètre explicite et fonction SQL `clara_native_read_session` ; `nativeOperationFence` refuse les anciennes opérations natives non certifiées, sauf lecture calendrier sous consentement et ressource liée.
- `src/lib/capabilities/capability-policy.ts` : Make/Brevo/email en mode exécution nécessitent plan premium + approbation. **Ce contrôle n'est pas une garantie de simulation en Recette.**
- `src/lib/connectors/clara-live/execution-authority.ts` : transport HTTPS `fetch` vers `CLARA_LIVE_BASE_URL` si configuré. **Aucun verrou Recette explicite établi dans ce module.**
- `src/app/api/clara/chat/route.ts` : refus des actions physiques quand `nativeContext()` est actif ; le chemin d'exécution hors de ce contexte doit aussi être testé.

## Tests de sécurité obligatoires (à implémenter et exécuter avant déploiement)

| ID | Situation | Résultat attendu |
| --- | --- | --- |
| AUTH-01 | Absence de cookie | 401/refus, aucune donnée |
| AUTH-02 | Jeton invalide ou altéré | Refus sans fallback |
| AUTH-03 | Session expirée ou révoquée | Refus sans renouvellement implicite |
| AUTH-04 | Appartenance absente/révoquée | Refus même si la session existe |
| SCOPE-01 | Workspace étranger | Refus, aucune donnée inter-espace |
| SCOPE-02 | Client/projet/session manquant | Refus explicite |
| SCOPE-03 | Sélecteurs falsifiés, multiples ou malformés | Refus avant lecture/écriture |
| SCOPE-04 | Session appartenant à une autre mission | Refus de réutilisation |
| NATIVE-01 | Route native historique non certifiée | 503/refus, zéro effet externe |
| CAP-01 | Exécution Brevo/Make sans approbation | Refus |
| CAP-02 | Exécution Brevo/Make avec approbation en Recette | **Toujours simulée/bloquée ; aucun appel fournisseur** |
| MAIL-01 | SMTP/IMAP ou envoi commercial en Recette | Aucun appel réel ni email émis |
| GOOGLE-01 | Drive/Calendar/OAuth en Recette | Aucune délégation réelle ni appel sortant |
| VOICE-01 | ElevenLabs/Twilio en Recette | Aucun appel réel ni consommation fournisseur |
| LIVE-01 | Exécution physique via `authorizePhysicalExecution` en Recette | Refus avant `fetch`, même avec URL/token configurés |
| LIVE-02 | Chat proposant une action physique | Aucun ordre physique envoyé |
| REG-01 | Parcours fictif mission → chat simulé → document → journal → cockpit | Données durables uniquement dans Neon Recette |
| REG-02 | Retour navigateur/refresh/navigation entre pages | Contexte canonique préservé côté serveur |

## Critères d'exécution

1. Exécuter les tests avec des transports espions qui comptent les appels : **zéro appel réseau sortant** dans tous les scénarios Recette.
2. Vérifier les chemins directs et indirects (API, tâches asynchrones, adaptateurs, propositions approuvées).
3. Exiger un marqueur d'environnement Recette côté serveur, impossible à activer depuis le navigateur, et un refus par défaut si l'environnement n'est pas attesté.
4. Ne pas recopier de secrets Production ; aucun jeton, URL de fournisseur réel ou credential de Clara Live dans le jeu de tests.
5. Exécuter les tests existants de non-régression et documenter les échecs préexistants distinctement.
6. **Aucun GO déploiement tant que le verrou global Recette et ses tests ne sont pas démontrés.**

## État actualisé — 18/10/2026

Contrôle GitHub Actions sur commit `5d3ca8a8` : sécurité Recette #39139547974 **SUCCESS** ; Production P0 #39139547872 **SUCCESS**. Ce sont des validations de tests ciblés, **pas** la réception de l'interface réelle de la PR #176.

- **Couverts partiellement par `src/tests/recette-external-execution-guard.test.ts`** : CAP-02 (politique Make/Brevo), MAIL-01 (transport IONOS IMAP/SMTP), GOOGLE-01 (client OAuth et travail natif), VOICE-01 (moteur ElevenLabs et téléphonie), LIVE-01 (autorité physique). Les espions réseau attestent certains transports seulement ; ne pas conclure à une absence globale d'appels sortants.
- **Non encore attestés par la suite Recette** : AUTH-01 à AUTH-04, SCOPE-01 à SCOPE-04, NATIVE-01, CAP-01 (scénario négatif sans approbation), LIVE-02, REG-01, REG-02. Des tests préexistants peuvent couvrir des fragments, mais aucun GO global n'en découle.
- **Protection d'environnement** : le garde reconnaît `CLARA_OS_RUNTIME_MODE=recette`, l'identifiant Vercel du projet Recette ou la présence de `CLARA_RECETTE_MODE`. La configuration Vercel du projet isolé contient ce dernier marqueur. La propagation effective au runtime du code de la PR #176 reste à démontrer ; ne pas confondre déclaration de variable et attestation d'exécution.
- **Séparation des produits** : ni Clara Live ni Clara OS Production ne sont des cibles de déploiement ou d'essai dans ce chantier.

## Séquence d'acceptation de l'interface réelle

1. Attester l'identité de la source déployable : commit de la branche d'audit issu de la PR #176, migrations compatibles, dépendances et vulnérabilités évaluées.
2. Vérifier la session fictive **à la date effective du test** ; la session précédemment attestée expirait le 18/10/2026 à 12:00:43 UTC. Tout renouvellement doit utiliser le workflow manuel dédié, sans exposition de jeton.
3. Tester les refus de cookie invalide/expiré, membership révoqué, workspace étranger et sélecteurs incomplets sur le runtime isolé.
4. Tester cockpit, mission, conversation fictive, document, journal durable, retour cockpit, navigation et refresh avec preuve de persistance et de séparation des scopes.
5. Conserver le refus réseau des fournisseurs réels pendant toute cette recette. L'activation Twilio/ElevenLabs relève d'une phase distincte et explicitement autorisée.
6. N'envisager un déploiement **sur le seul projet `clara-os-recette`** qu'après résolution de ces prérequis et décision de GO isolé explicite.

## Contrôle Neon isolé en lecture seule — 18/10/2026

- Branche : `br-crimson-feather-b2zr00sf`, rôle `clara_os_recette_limited`, base `neondb`.
- Schéma inspecté : `clara_auth_sessions` exige `expires_at > created_at`, référence un utilisateur et expose `revoked_at` ; `clara_workspace_memberships` a une clé composite utilisateur/espace, un rôle contrôlé et `revoked_at`.
- Requêtes d'agrégats sans identifiants ni jetons : **1 session expirée non révoquée**, **0 session active non révoquée** au moment du contrôle.
- Le code de résolution de session exige `expires_at > NOW()` et `revoked_at IS NULL`, puis une appartenance non révoquée. Les agrégats confirment la situation du jeu fictif, **pas** une preuve E2E de refus par l'API ni un test de révocation.
- Ne pas renouveler la session par écriture SQL ; utiliser le workflow manuel de fixture dédié, avec contrôle de branche et sans divulguer de jeton.
- Les scénarios de révocation et de retrait d'appartenance restent **NON TESTÉS en base** ; aucune suppression ni modification de données n'a été réalisée.

## Audit de dépendances confirmé par CI — 18/10/2026

Workflow `Clara OS Recette - offline security regression` #36 (run 39149063970) : succès des tests et de l'inventaire, **pas** de correction ni de validation de sécurité des dépendances. `npm audit --omit=dev --json` signale cinq paquets de production : `next` (critique, direct, plage vulnérable `16.0.0 - 16.3.7`), `axios` (élevée, transitif, `1.0.0 - 1.19.0`), `brace-expansion` (élevée, transitif, `2.0.0 - 2.1.6`), `sharp` (élevée, transitif, `<=0.35.5-rc.1`) et `qs` (modérée, transitif, `2.2.5 - 6.15.3`). `fixAvailable=true` pour chacun selon npm. Ne pas confondre avec les 13 alertes de `npm ci`, qui incluent les dépendances de développement.

**Gate dépendances : NO-GO** tant qu'une branche isolée n'a pas prouvé les versions résolues non vulnérables, le build, les tests ciblés, les migrations et les E2E. Aucune mise à jour forcée ni modification de production autorisée.

**Gate réseau : ouvert.** Les protections connues (IONOS, Brevo, Google, Make, ElevenLabs TTS/STT/session, téléphonie, Clara Live) ont été vérifiées par tests ciblés ; pas de preuve exhaustive des autres appels HTTP/SDK, webhooks, OAuth ou stockage. Une analyse systématique de toutes les routes et transports reste nécessaire.

**Gate API runtime : ouvert.** La session fictive valide et l'appartenance active sont attestées par SQL en lecture seule. Les tests SQL injectés couvrent la logique de révocation, pas le refus HTTP en runtime isolé. Avant une recette fonctionnelle, tester sans jetons dans les logs : 401 cookie absent/malformé, 403 workspace/session étrangère, rôle insuffisant, puis scénarios de révocation via fixture autorisée et auditée. Ne pas révoquer la seule session active par écriture SQL ad hoc.
