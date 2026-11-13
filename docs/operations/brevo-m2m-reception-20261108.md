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

## Propriétaire : une seule intervention indispensable, hors ChatGPT/GitHub
Créer **une application privée** `Clara OS - Melodie Digital` depuis un terminal privé avec une CLI Brevo à jour :

    npm install -g @getbrevo/cli@latest
    brevo login
    brevo app create --name "Clara OS - Melodie Digital" --distribution private --m2m --scopes "contacts:read,campaigns.email:read,transactional.email:read"

Commencer STRICTEMENT par les trois scopes READ, car le chemin natif traite contacts, listes, campagnes et modèles transactionnels. Ne pas accorder `contacts:write` ni `campaigns.email:write` à cette première application : l'écriture/l'envoi doivent faire l'objet d'une réception d'autorité indépendante.

Si `brevo login` échoue dans Codespaces, faire cette opération **depuis un terminal local** plutôt que de désactiver la sécurité du compte. Ne jamais publier le `client_secret`, le token ou la sortie de la commande dans un chat, une issue ou un dépôt.

Stocker `BREVO_M2M_CLIENT_ID` et `BREVO_M2M_CLIENT_SECRET` uniquement dans un gestionnaire de secrets destiné à l'environnement de test isolé lorsqu'un environnement adapté existe. **Ne pas renseigner Vercel Production ni modifier sa configuration sous ce GO.** L'ancienne clé API Production reste inchangée.

## Réutilisation et protections de la PR #270
- Le client Brevo existant sait transmettre `Authorization: Bearer <token>` ; requêtes de consultation GET uniquement, limite 10 enregistrements.
- Échange `client_credentials` vers `https://api.brevo.com/realms/partner/oauth/token`, scope précis explicitement demandé pour chaque lecture ; token de courte durée, sans stockage persistant.
- Validation du bearer, de son scope et de son expiration ; timeout et refus de redirection ; aucun secret dans les diagnostics.
- M2M partiellement configuré ou rejeté : **fail closed**, aucun basculement silencieux vers une clé API statique.
- Contrôle de session native et du workspace, aucune nouvelle autorité SEND/WRITE.
- Ne pas confondre le chemin READ réellement raccordé avec les capacités déclaratives Brevo V2 : l'exécution via le Builder complet n'est pas certifiée.

## Réception : GO / NO-GO
1. **Sans action propriétaire** : inspecter la branche Draft, constater la CI historique, vérifier non-régression, identifier les éventuels conflits avec la livraison courante. Ne pas créer un nouveau système, une PR parallèle ou un environnement de recette lourd.
2. **Une fois les identifiants privés disponibles dans un environnement isolé autorisé** : demander `contacts:read`, puis consulter les listes, sans donnée simulée présentée comme réelle. Confirmer authentification, scopes, résultats et refus sécurisés.
3. Refus 401/403, token invalide, scope non conforme, identité/workspace non autorisé, ou mise en réseau Production imprévue = **NO-GO**.
4. Pour la future Production : GO explicite distinct, rapprochement de la branche courante, CI à jour, réception réelle authentifiée, plan de retour arrière.
5. **Interdits sous ce GO : merge, Ready, déploiement Vercel (Preview ou Production), modification des secrets Production, activation d'envoi ou de campagne.**

Référence : https://developers.brevo.com/docs/oauth-m2m-authentication
