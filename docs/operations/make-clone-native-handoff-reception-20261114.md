# Clara OS → Make — raccordement natif isolé (14/11/2026)

**Préparé dans une branche GitHub non fusionnée. NON CERTIFIÉ en session réelle.**
Clara OS Production, recette Vercel, Make fournisseur et Clara Live : inchangés.

## Preuves existantes
- API Make et scénario réel `CLARA – Find Drive Document` (7295042) exécutés auparavant : succès, un crédit fournisseur.
- Clone Neon `br-nameless-dew-b2v6asgj` : connexion `make-read-fixture-249-20261106`, statut `CONFIGURED`, 1 secret AES-256-GCM ; déchiffrement effectué avec succès en Codespaces.
- Aucun grant actif, aucune entrée du catalogue activée, aucun droit WRITE/SEND.
- La fonction SQL `clara_make_runtime_scope.native_make_read_ciphertext(...)` est installée sur clone, avec `EXECUTE` seulement pour `clara_make_runtime_login`, refusée au provisionneur et à PUBLIC. Son test de session invalide retourne `NATIVE_SCOPE_DENIED`.

## Chaînage ajouté en code
- `src/lib/native/make-scoped-credentials.ts` : vérification stricte de l'hôte/du rôle/de la base isolés, clé de clone distincte, coffre lecture seule utilisant **le SQL scoped**, sans SELECT direct sur les tables. Refus de toute écriture.
- `src/lib/native/make-clone-read-bridge.ts` : réutilise `nativeMakeReadAuthority`, `ConnectionResolver`, `CredentialStore` et `MakeConnectorAdapter` ; impose workspace, connexion, scénario et révision. L'autorisation est revérifiée par `executeAuthorizedNativeMakeRead` après la réponse fournisseur.
- Le bridge **n'est pas branché au chat ni exposé en route publique**, afin de ne pas élargir les capacités actives sans authentification testée.
- Aucun changement aux connecteurs Google, Brevo, Live, au Brain ni aux garde-fous Recette.

## Test hors ligne dans le Codespace
```bash
git pull --ff-only origin ops/make-clone-credential-preflight-20261114
node --import tsx --test src/tests/make-native-scoped-credentials.test.ts src/tests/make-clone-read-bridge.test.ts src/tests/make-native-read-handoff.test.ts
```
Les tests n'effectuent aucun appel fournisseur. La branche doit rester isolée. Ne pas lancer `--commit` de nouveau.

## Verrou restant avant le cycle grant → READ → revoke
Le rôle `clara_make_runtime_login` peut appeler les fonctions ciblées mais **ne peut pas appeler directement** `clara_native_runtime_command(...)` pour initialiser `withNativeScope` ; cette fonction est SECURITY INVOKER, liée à des tables natives auxquelles le rôle n'a pas accès. Ne pas lui accorder SELECT général sur les tables. La recette Vercel est liée à un autre clone et bloque toujours les appels Make externes. Il faut concevoir et qualifier un **point d'entrée natif authentifié dédié**, exécuté avec des droits SQL strictement revus, ou une recette isolée réellement attachée au clone Make. Ne pas falsifier la session.

Une fois le point d'entrée attesté : certifier le contrat READ, approuver et activer la seule entrée `find-drive-document`, puis attribution native et audit, exécution réelle unique, révocation et refus. Cette étape exige GO distinct de réception réelle. Le provider et le secret fonctionnent, **le bout-en-bout Clara n'est pas certifié**.

NO-GO merge, Ready, Vercel Preview, Production et exécution Make supplémentaire.

## Complément après les 14 tests PASS (14/11/2026)
- L'utilisateur a exécuté 14 tests hors ligne : 14 PASS, 0 échec. Tests de non-autorisation, READ strict et révocation pendant l'appel validés **avec doubles de test**, pas encore avec une session Clara connectée.
- Fonction `clara_make_runtime_scope.native_runtime_read(digest,w,c,p,s)` installée sur le **clone uniquement**. C'est un wrapper `SECURITY DEFINER` en lecture seule, qui réutilise `public.clara_native_runtime_command(...,'read','{}')`. Elle ne donne aucune permission générale sur les tables, ne crée pas de session et ne permet pas de commit.
- ACL vérifiée : EXECUTE seulement propriétaire et `clara_make_runtime_login`. `PUBLIC` et le provisionneur n'ont pas EXECUTE.
- Test négatif avec le rôle runtime et un digest/session factices : refus réel `NATIVE_SCOPE_DENIED` / SQLSTATE 42501. Il ne s'agit **pas** d'un test positif d'une session authentifiée.
- État Neon après contrôle : connexion `CONFIGURED`, un ciphertext, zéro scénario activé, zéro autorisation active ; aucun Make fournisseur appelé.
- **Blocage conservé** : le projet Vercel Recette actuel est lié à un autre clone et ses appels externes sont interdits ; le rôle `clara_make_runtime_login` n'a toujours pas d'environnement Clara OS authentifié dédié complet, ni de chemin de session validé dans le chat. Ne pas remapper silencieusement les secrets ni lever les garde-fous de Recette.

## Point d'arrêt anti-surtests (14 novembre 2026)

Vérification en lecture seule du clone, sans accès aux jetons : **0 session d'authentification non révoquée et non expirée**, 22 conversations stockées (elles ne prouvent pas l'existence d'une session active), 10 droits de session native, connexion Make CONFIGURED avec un seul secret chiffré, 0 scénario activé, 0 grant Make actif.

**Décision d'ingénierie : ne plus demander à l'utilisateur de relancer des tests unitaires ou des commandes de contrôle sur ce lot.** La condition bloquante est une *session OS réellement authentifiée, dans un environnement isolé relié au clone*, pas un défaut de chiffrement. Ne pas créer un faux digest ni relâcher les contrôles Recette pour produire artificiellement un PASS. Reprendre uniquement lorsqu'une session isolée réelle est disponible; effectuer alors une **réception intégrée unique** grant → READ Drive → revoke → refus, avec consultation du journal, puis demander un GO distinct pour toute livraison.

Aucune activation, aucun appel Make, aucune fusion ni aucun déploiement lors de ce point d'arrêt.

## Raccordement conversationnel minimal — GO du 14 novembre

- `src/lib/native/scoped-context.ts` : la lecture de session sur le **clone exact** utilise désormais le wrapper de lecture `clara_make_runtime_scope.native_runtime_read`. La voie d'écriture et le comportement de Production restent inchangés.
- `src/lib/native/make-read-intent.ts` : sélection limitée à une demande explicite de recherche Drive **avec Make**, comportant un titre entre guillemets (exemple : « Clara, cherche avec Make dans Google Drive le document « Test Clara ». »). Aucune sélection implicite à partir d'un document.
- `src/lib/brain/brain-source-registry.ts` : la demande explicite passe par `executeCloneNativeMakeDriveRead`; faute d'autorisation, une réponse indisponible est fournie au Brain, **sans appel Make**, repli fournisseur ni résultat inventé.
- `src/lib/native/make-clone-read-bridge.ts` : vérification d'environnement isolé avant toute tentative d'accès.
- Le test de refus hors clone a été aligné. **Ces ajouts n'ont pas encore de preuve de compilation ni de session OS réelle.**

### Constat d'hébergement et arrêt sans déploiement

Inspection Vercel **en lecture seule** : le seul projet `clara-os-recette` actuel est lié au projet `prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz`, avec un environnement personnalisé `clara-os-recette`; sa configuration source réclame un autre clone Neon (`br-crimson-feather-b2zr00sf`). Le garde-fou `assertRecetteExternalExecutionBlocked('make.api')` est toujours actif dans le client Make. Aucun nouvel environnement OS isolé, authentifié, connecté au clone Make n'a été trouvé dans les ressources Vercel inspectées.

Le clone Make contient **zéro session d'authentification encore valide**. Le rôle `clara_make_runtime_login` dispose des fonctions READ ciblées mais pas de la chaîne d'écriture complète nécessaire pour une conversation OS persistée ; il ne faut pas élargir ses droits généraux ni créer une fausse session. En conséquence, **ne pas annoncer une disponibilité Make dans OS**. L'opération `grant → READ réel → revoke` doit rester NON TESTÉE.

Une unique réception utilisateur reste conditionnée à une **véritable session OS authentifiée sur le même clone** et à une mise à disposition isolée autorisée séparément, **sans Vercel Preview, merge ou déploiement Production**. Ne plus solliciter l'utilisateur pour des tests unitaires. La prochaine décision doit porter uniquement sur la méthode d'hébergement isolé et ses autorisations, et non sur le jeton déjà validé.

## GO — carte Automatisations fondée sur preuve (14/11/2026)

Le badge Make n'est plus simplement constant sur la branche de travail :
- `src/app/api/native/make/status/route.ts` consulte une fonction SQL native **après résolution de la session authentifiée**, sans renvoyer d'identifiants ni lancer de scénario fournisseur. Hors clone explicitement autorisé, le statut reste `uncertified`.
- `src/components/automatisations/MakeAutomationCertification.tsx` fournit les cinq traductions et les états `uncertified`, `configured`, `ready_for_test`, `certified`, `certified_inactive`. La UI ne peut pas afficher un état `certified` si l'API ne renvoie pas de preuve `certified:true`.
- `src/app/automatisations/page.tsx` utilise ce composant seulement sur la carte Make. Aucune exécution de scénario depuis cette page.
- `clara_make_runtime_scope.native_make_read_certifications` est une table de preuve vide installée sur le clone, non accessible au rôle runtime. Seul un opérateur habilité et une preuve de réception réelle peuvent créer son entrée. Une connexion `CONFIGURED` n'est jamais une certification.
- La fonction SQL `native_make_readiness` est `SECURITY DEFINER` et exécutable uniquement par le rôle runtime, pas par le provisionneur ni PUBLIC. Une session factice a été rejetée avec `NATIVE_SCOPE_DENIED`.

**État constaté** : 0 preuve de certification, 0 session d'authentification OS active sur le clone, 0 scénario activé, 0 grant Make actif ; un jeton chiffré, connexion CONFIGURED. **Aucun test utilisateur ni exécution fournisseur** n'a été effectué dans ce lot. Les nouveaux tests sources `src/tests/make-automation-certification.test.ts` sont préparés mais pas encore exécutés ; contrôle de cohérence du code : PASS. La qualification E2E et le déploiement restent NO-GO.

L'environnement Vercel Recette actuel reste relié à une autre base et conserve son interdiction d'appels Make. Ne pas contourn­er sa protection ni créer une certification fictive. Une réception authentifiée unique sur un environnement isolé reste indispensable pour qualifier Clara → Make puis la révocation.
