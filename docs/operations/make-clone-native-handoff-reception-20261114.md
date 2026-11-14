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
