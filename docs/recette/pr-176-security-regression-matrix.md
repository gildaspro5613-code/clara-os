# PR #176 — plan de tests de sécurité Recette (non exécutés)

**État : spécification uniquement. NO-GO déploiement / NO-GO Production.**

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
