# Clara OS — réception Brevo M2M (8 novembre 2026)

## Objectif
Brevo rejette les requêtes API-key natives avec 401 et de nouvelles IP sortantes
AWS non autorisées ont été détectées après les essais. Autoriser une IP n'est
pas durable si les IP Vercel changent. Tester une application privée M2M avec
client_credentials et bearer de courte durée, sans supposer que M2M
contourne le filtrage IP (cela n'est PAS certifié dans la documentation).

## Propriétaire : préparation de l'application Brevo
Installer la CLI récente dans un terminal privé :

    npm install -g @getbrevo/cli@latest
    brevo login
    brevo app create --name "Clara OS - Melodie Digital" --distribution private --m2m --scopes "contacts:read,contacts:write,campaigns.email:read,campaigns.email:write,transactional.email:read" --json

Ces scopes reflètent l'objectif final de gestion. Le droit
campaigns.email:write couvre aussi les envois chez Brevo, mais **la
présence du scope M2M ne crée aucun droit WRITE dans Clara OS**.
L'Autonomy Gate et l'approbation explicite restent nécessaires et
non certifiés dans ce lot. Pour une réception de lecture uniquement,
commencer avec les trois scopes READ est également possible : le
catalogue d'autorisations sera alors élargi plus tard par full replace.

Dans Vercel clara-os Production uniquement, renseigner en secret serveur :
- BREVO_M2M_CLIENT_ID
- BREVO_M2M_CLIENT_SECRET

Ne pas mettre les secrets dans GitHub, dans le chat ou dans les journaux.
Ne pas remplacer BREVO_CLIENT_SECRET, qui correspond à un flux OAuth
avec utilisateur. Garder l'ancienne BREVO_API_KEY pour retour arrière,
mais ne jamais l'utiliser comme fallback lorsque M2M est partiellement
ou entièrement configuré.

## Correctif minimal Draft
- Réutilise BrevoClient qui sait déjà utiliser Authorization: Bearer.
- Pour les lectures natives dans une vraie session Clara : un token
  exclusivement pour contacts:read, campaigns.email:read ou
  transactional.email:read, selon la demande.
- Endpoint token fixe : https://api.brevo.com/realms/partner/oauth/token
- POST client_credentials avec un scope explicite, redirect interdit,
  timeout borné, vérification stricte du scope et de l'expiration.
- Requête métier Brevo GET bornée à 10 résultats ; aucun envoi ni
  création de campagne. Les capacités WRITE existantes restent
  sans raccord M2M tant que l'autorité et le journal ne sont pas certifiés.
- Aucun changement de DB, Brain architecture, routes Google ou Make.
- La page Connexions signale seulement la configuration ; ne prétend
  jamais prouver une réponse fournisseur.

## GO / NO-GO
1. CI et tests simulés en recette, pas de vrai fournisseur en GitHub.
2. Après création de l'application et configuration autorisée, tester
   deux lectures depuis des invocations Vercel distinctes et examiner
   les alertes IP sans désactiver la protection.
3. Si 401 / 403, NO-GO et diagnostic avant tout déploiement général.
4. Pour WRITE/SEND, contrôler distinctement Autonomy Gate, prévisualisation,
   validation humaine explicite, journal durable et idempotence avant activation.
5. Aucun merge, Preview, Production ou modification Brevo dans ce Draft.

Références :
https://developers.brevo.com/docs/oauth-m2m-authentication
https://developers.brevo.com/docs/oauth-scopes
https://developers.brevo.com/changelog/2026/10/13
