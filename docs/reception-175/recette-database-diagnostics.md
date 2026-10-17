# Diagnostic serveur du refus SQL Recette

Source approuvée : `ef4a2215d5a9470ea32561374c47b818e2cf69d3`. Correction empilée sur la branche de #177, sans modifier #176/#177, leurs sources ni le workflow de déploiement.

## Établi / non établi

L'erreur générique du déploiement `dpl_BMzhvQPFL1Uovaa9qGZuf9mqh8pV` ne permet pas de choisir entre les refus locaux de `recetteDatabase()` et du calcul d'endpoint Neon. Ces vérifications précèdent toute connexion SQL. Aucune valeur effective Vercel n'a été lue ; la cause de ce déploiement reste **NON DÉTERMINÉE**, aucune absence/présence de variable n'est inférée.

Ordre conservé : contexte Vercel → hôte déclaré → branche déclarée → POSTGRES_URL → analyse/critères DATABASE_URL → origine HTTPS → endpoint HTTP Neon → installation des barrières. Le premier refus interrompt le démarrage ; plusieurs erreurs se corrigent successivement, pas par contournement.

`VERCEL_ENV=preview` est admis avec `VERCEL_TARGET_ENV=clara-os-recette`, `VERCEL=1` et le mode exact. Il ne prouve pas que le mauvais target a été sélectionné ni quelles variables Vercel/Neon sont effectivement injectées. Target absent/incorrect : erreur distincte `RECETTE_CONFIGURATION_REFUSED` avant les contrôles SQL. Le statut preview dans les logs n'explique donc pas à lui seul le refus observé.

Le workflow sur main a été lu via GitHub, pas modifié : `.github/workflows/clara-os-recette-177.yml` (blob `29bbc25b6290fd3cf491cb00437ee9b35a68a35b`) fixe APPROVED_SHA, checkout et vérification à ef4a221 ; commande explicite `vercel deploy --yes --target=clara-os-recette --scope melodie-digital`. Il ne référence pas POSTGRES_URL. Cela n'exclut pas une injection par l'intégration Vercel/Neon. Aucun mécanisme disponible ici ne permet de consulter les métadonnées Vercel autorisées ; aucun export de variables effectué.

## Diagnostics distincts

Préfixe de log : `[CLARA_RECETTE_STARTUP] RECETTE_DB_…`. Les suffixes ci-dessous sont des constantes, jamais les valeurs fautives :

| Suffixe | Refus local exact |
|---|---|
| `HOST_MISSING` / `HOST_INVALID` | Host déclaré absent / hors regex Neon ep- autorisée |
| `BRANCH_MISMATCH` | Branch ID différent de br-crimson-feather-b2zr00sf |
| `POSTGRES_URL_PRESENT` | POSTGRES_URL truthy, même si DATABASE_URL est correcte ; chaîne vide non refusée par ce test |
| `DATABASE_URL_MISSING` / `DATABASE_URL_INVALID` | URL absente/vide / URL non analysable |
| `PROTOCOL_INVALID` | Protocole autre que postgres: ou postgresql: |
| `HOST_MISMATCH` | Host de l'URL différent du host déclaré, variantes pooler comprises |
| `ROLE_MISMATCH` / `NAME_MISMATCH` | Rôle différent du rôle limité / base différente de neondb |
| `PASSWORD_MISSING` / `FRAGMENT_FORBIDDEN` | Mot de passe vide / fragment d'URL présent |
| `SSL_MODE_COUNT_INVALID` / `SSL_MODE_INVALID` | Nombre de sslmode différent de 1 / valeur autre que require |
| `PORT_INVALID` | Port explicite différent de 5432 |
| `QUERY_KEY_FORBIDDEN` | Paramètre autre que sslmode ou channel_binding |
| `CHANNEL_BINDING_COUNT_INVALID` / `CHANNEL_BINDING_INVALID` | channel_binding présent plusieurs fois / autre valeur que require |
| `NEON_ENDPOINT_INVALID` | Calcul ou analyse de l'endpoint SDK impossible |
| `NEON_ENDPOINT_PROTOCOL_INVALID` / `NEON_ENDPOINT_HOST_INVALID` / `NEON_ENDPOINT_PATH_INVALID` | Endpoint calculé non HTTPS / hors .neon.tech / chemin autre que /sql |

Les règles d'acceptation restent inchangées. Les exceptions du calcul/analyse d'endpoint sont désormais remplacées par un refus générique sûr, sans propager le texte d'une exception contenant potentiellement une URL. Le contrôle ne prouve toujours pas l'association réelle hostname/branche : conserver son attestation administrative préalable. Les autres variables de connexion ne sont pas introduites comme fallbacks.

## Fichiers et confidentialité

- `src/lib/recette/policy.ts` : décomposer les mêmes prédicats dans le même ordre, sans assouplissement.
- `src/lib/recette/diagnostics.ts` : erreur publique toujours `RECETTE_DATABASE_REFUSED` ; suffixe interne non énumérable, aucune cause/valeur jointe. Journaliser seulement une constante depuis le hook, uniquement pour target recette et hors Production. Les erreurs inconnues ne sont pas journalisées par ce rapporteur.
- `src/lib/recette/transport.ts` : calcul d'endpoint diagnostiqué avant les mêmes barrières ; pas de requête ajoutée.
- `instrumentation.ts` : journaliser le label sûr puis **relancer l'erreur d'origine**, sans reprendre le démarrage ni contourner le hook.
- `src/tests/recette-isolation.test.ts` : couvrir les 22 suffixes, le vrai hook, la réponse HTTP générique et l'absence de changement des transports au démarrage Production normal ; conserver les tests de refus des fournisseurs et les opérations internes.

Aucun endpoint HTTP de diagnostic ajouté. Les handlers ne journalisent pas ces détails et leurs réponses restent génériques. Ne pas retourner l'erreur interne ni son diagnostic dans un futur handler. Aucun secret, URL SQL, mot de passe, token ou valeur d'environnement ne figure dans les labels. Aucun droit SQL, aucune variable, aucune branche Neon modifiés.

## Validation et prochaine étape autorisée

Tests locaux : **28/28 réussis, aucun échec/ignoré**, avec uniquement des valeurs fictives et des réponses SQL contrôlées ; **32/32 non-régressions P0/documentaires/commerciales réussies**. TypeScript, lint ciblé et build Next webpack réussis, polices simulées localement sans appel Google ni désactivation TLS. Sur le serveur compilé, une configuration entièrement fictive avec POSTGRES_URL non vide produit le label exact `RECETTE_DB_POSTGRES_URL_PRESENT` puis le refus générique ; les logs ne contiennent ni secret synthétique, ni URI SQL, ni hostname de test. Aucun effet SQL/fournisseur. Les campagnes 55/45/9 ne sont pas recommencées.

Pour obtenir le refus réel, après revue et autorisation explicite :

1. Approuver le SHA de cette correction. Le workflow sur main est fixé à ef4a221 : le relancer tel quel ne chargera **pas** ces nouveaux diagnostics.
2. Faire approuver séparément une adaptation de ses seules références de source (APPROVED_SHA, checkout, vérification et résumé) au nouveau SHA. Conserver target, équipe et contrôles de déploiement. Cette adaptation est une proposition, **non appliquée dans cette PR** ; aucun workflow modifié ni déclenché ici.
3. Autoriser le déploiement vers le seul target recette. Relever son SHA effectif. Provoquer un unique chargement de `/` ou `/recette`, puis ouvrir les logs serveur de ce déploiement dans l'espace administrateur Vercel.
4. Relever uniquement `[CLARA_RECETTE_STARTUP] RECETTE_DB_<SUFFIXE>`, sans exporter d'environnement ou URI. Ce label identifie le **premier** prédicat faux. Un marqueur absent peut indiquer source ancienne, métadonnées ne permettant pas de journaliser, ou autre erreur : ne pas conclure qu'une variable est conforme.
5. Selon le code, proposer une correction limitée aux variables effectives de recette ou à l'injection Neon, en conservant les barrières. Attendre son autorisation avant toute modification. Ne jamais corriger un HOST_MISMATCH en adoptant un endpoint sans vérifier son appartenance à la branche dédiée.

**Verdict : instrumentation nécessaire pour départager les causes au prochain essai autorisé ; aucune cause effective ni correction de configuration particulière n'est affirmée aujourd'hui. Aucun merge ni déploiement exécuté.**
