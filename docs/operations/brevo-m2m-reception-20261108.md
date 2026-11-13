# Clara OS — Brevo M2M : préparation isolée (mise à jour 13 novembre 2026)

## Décision et périmètre
Brevo (Rachid D., confirmation technique transmise par le propriétaire) confirme que les jetons OAuth 2.0 Machine-to-Machine ne sont pas soumis au filtrage IP appliqué aux clés API classiques. L'utilisation de Vercel et GitHub Codespaces à IP sortantes dynamiques est donc prévue sans désactiver le filtrage IP du compte ni autoriser de larges plages d'adresses.

Le correctif de la PR Draft #270 remplace uniquement l'authentification du **chemin de consultation Brevo natif déjà présent** (API key statique -> jeton M2M à scope explicite). Pas de nouveau moteur, de nouvelle capacité WRITE/EXECUTE, de route publique, de refonte UI ou de migration DB. Aucun changement de Production n'est autorisé dans cette phase.

## État constaté dans la branche de livraison
- Connector Core : `src/lib/connectors/core/connector-engine.ts`
- Contrats Brevo V2 et adaptateur : `src/lib/connectors/brevo/definition.ts`, `adapter.ts`, `brevo-executable-connector.ts`
- Registre existant : `src/lib/capabilities/capability-registry.ts`
- Lecture effective par la conversation native : `src/lib/brain/brain-source-registry.ts` et `src/lib/connectors/brevo/api-key-read.ts`
- Le Builder autonome complet « discover -> generate -> validate -> register -> execute » **n'est pas attesté opérationnel** par cette vérification ; ne pas le déclarer validé, ni développer un second système pour Brevo.
- La PR #270, créée le 8 novembre, a des CI historiques réussies, mais a divergé de `delivery/clara-os-v1-20261025`. Réconciliation et validations à refaire **en isolation** avant tout GO ultérieur.

## Identifiants existants : aucune création répétée sans vérification
Le propriétaire a déjà conservé **deux jeux d'identifiants Brevo** : une configuration Clara lecture seule et une configuration Mélodie Digital à autorisations étendues. **Ne pas en créer de nouveaux par défaut.** Les métadonnées Vercel (13 novembre) indiquent une variable `BREVO_API_KEY` en Production, mais aucune variable `BREVO_M2M_CLIENT_ID` ou `BREVO_M2M_CLIENT_SECRET` ; cela ne prouve pas l'absence d'une application M2M dans le compte Brevo. Ne pas lire ni divulguer les valeurs.

Vérifier **d'abord la nature** des identifiants déjà conservés : les clés API (header `api-key`) ne sont pas interchangeables avec le couple OAuth M2M `client_id` + `client_secret`. Si un couple M2M existe, **le réutiliser**, en contrôlant ses scopes et sans rotation inutile. Si et seulement si aucun couple M2M n'existe, créer **une** application privée depuis un terminal privé, avec CLI Brevo récente. Codespaces n'est pas indispensable pour l'authentification Brevo.

Le chemin de **réception initiale** de cette PR est READ seulement (`contacts:read,campaigns.email:read,transactional.email:read`) pour éviter tout envoi pendant les tests. **La cible fonctionnelle de Clara est bien READ + PREPARE + WRITE/EXECUTE autorisés**, et il ne faut pas la réduire au READ à long terme. Les autres scopes (dont `contacts:write`, `campaigns.email:write`) s'ajouteront à une application M2M **existante** si nécessaire, après validation de l'autorité, de la confirmation humaine pour SEND, du journal et de l'idempotence. Ne pas confondre droit fournisseur et permission du Brain.

Stocker les secrets M2M exclusivement dans un coffre destiné à l'environnement isolé autorisé lorsqu'il existe. **Aucune modification des variables Vercel Production sous ce GO.** Conserver les deux jeux d'identifiants existants.

## Réutilisation et protections de la PR #270
- Le client Brevo existant sait transmettre `Authorization: Bearer <token>` ; requêtes de consultation GET uniquement, limite 10 enregistrements.
- Échange `client_credentials` vers `https://api.brevo.com/realms/partner/oauth/token`, scope précis explicitement demandé pour chaque lecture ; token de courte durée, sans stockage persistant.
- Validation du bearer, de son scope et de son expiration ; timeout et refus de redirection ; aucun secret dans les diagnostics.
- M2M partiellement configuré ou rejeté : **fail closed**, aucun basculement silencieux vers une clé API statique.
- Contrôle de session native et du workspace, aucune nouvelle autorité SEND/WRITE.
- Ne pas confondre le chemin READ réellement raccordé avec les capacités déclaratives Brevo V2 : l'exécution via le Builder complet n'est pas certifiée.

## Vérification d'isolement — 13 novembre 2026

**Blocage confirmé côté transports :** les environnements Vercel `clara-os-recette` portent la variable `CLARA_RECETTE_MODE`. Le garde central `src/lib/recette/external-execution-guard.ts` considère sa seule présence comme un mode de recette, quelle qu'en soit la valeur. Dans ce mode :
- `requestBrevoM2MReadToken` refuse l'appel fournisseur avant la demande de token (`assertRecetteExternalExecutionBlocked('brevo.m2m')`).
- `BrevoClient` refuse également les lectures réseau réelles en recette (test explicite dans `recette-external-execution-guard.test.ts`).
- `MakeOnDemandClient` et `MakeWebhookClient` refusent toute invocation fournisseur réelle, y compris les trois scénarios étiquetés READ.
- Ne pas désactiver, supprimer ou contourner ces gardes pour « faire passer » une recette ; ne pas utiliser la Production pour remplacer cette recette.

**Conséquence :** dans la recette actuelle, valider la logique M2M/GET/autorité avec faux transports uniquement et ne jamais annoncer une vraie lecture Brevo ou Make. Une réception réelle depuis Clara exige un environnement séparé explicitement approuvé, avec autorité native, identité authentifiée, secrets en coffre, isolation forte des WRITE/SEND et réseau fournisseur borné ; cette mise en place n'est **pas autorisée par le GO actuel**. Les jetons existants ne sont ni à recréer ni à insérer dans les variables Production sous ce GO.

**Make, état du clone `br-nameless-dew-b2v6asgj` (lecture seule) :** catalogue 9/9 présent mais toutes les entrées désactivées, une autorité READ révoquée, connexion `RECONNECT_REQUIRED`, aucun secret chiffré associé, `clara_make_runtime_test` NOLOGIN, aucun rôle applicatif LOGIN minimal trouvé. Une restauration de connexion et une recette grant → READ → revoke exigeraient une autorisation distincte de mutation de ce clone ; aucun scénario Make n'a été lancé.

## Réception : GO / NO-GO
1. **Sans action propriétaire** : inspecter la branche Draft, constater la CI historique, vérifier non-régression, identifier les éventuels conflits avec la livraison courante. Ne pas créer un nouveau système, une PR parallèle ou un environnement de recette lourd.
2. **Une fois les identifiants privés disponibles dans un environnement isolé autorisé** : demander `contacts:read`, puis consulter les listes, sans donnée simulée présentée comme réelle. Confirmer authentification, scopes, résultats et refus sécurisés.
3. Refus 401/403, token invalide, scope non conforme, identité/workspace non autorisé, ou mise en réseau Production imprévue = **NO-GO**.
4. Pour la future Production : GO explicite distinct, rapprochement de la branche courante, CI à jour, réception réelle authentifiée, plan de retour arrière.
5. **Interdits sous ce GO : merge, Ready, déploiement Vercel (Preview ou Production), modification des secrets Production, activation d'envoi ou de campagne.**

Référence : https://developers.brevo.com/docs/oauth-m2m-authentication
