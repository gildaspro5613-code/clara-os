# Recette PR #176 — protocole HTTP d'autorisation sans secrets

## Prérequis bloquants

La cible doit être un déploiement **isolé** du code réel de PR #176, attesté par SHA Git, et non la page diagnostique issue de PR #192. Vérifier l'identité du projet Vercel `clara-os-recette`, les indicateurs Recette, la branche Neon fictive, l'absence de connexions fournisseurs et la présence des routes natives avant tout test. Aucune requête HTTP à Clara OS Production ni à Clara Live.

Ne jamais afficher, journaliser, copier dans GitHub Actions ou retourner dans un rapport les cookies, tokens, secrets, URLs de connexion SQL ou en-têtes Authorization. Les assertions doivent porter uniquement sur le statut HTTP, le code d'erreur stable et l'absence d'effet durable hors du périmètre fictif.

## Matrice des scénarios sur la vraie application

| Cas | Préparation | Résultat attendu |
| --- | --- | --- |
| HTTP-01 | GET route protégée sans cookie | 401 ou refus explicite avant toute donnée de mission |
| HTTP-02 | Cookie canonique malformé, puis dupliqué | 401 / aucune fuite |
| HTTP-03 | Session fictive valide, workspace fictif autorisé | 200 et uniquement données fictives du workspace |
| HTTP-04 | Session valide, workspace étranger | 403 ou 404, aucune donnée étrangère |
| HTTP-05 | Sélecteurs mission/session absents, dupliqués ou malformés | 400/403, aucun repli global |
| HTTP-06 | Session expirée ou révoquée via **workflow manuel de fixture** | 401, y compris après rafraîchissement |
| HTTP-07 | Membership révoqué via procédure isolée autorisée | 403, aucun privilège conservé |
| HTTP-08 | Rôle insuffisant pour écriture | 403, aucun effet durable |
| HTTP-09 | Deux sessions/projets distincts | Aucun mélange de conversation, journal, mission |
| HTTP-10 | Tentative d'action fournisseur (Google, Microsoft, IONOS, Make, Brevo, ElevenLabs, téléphonie, Live) | Refus Recette avant réseau, zéro effet externe |

**Conditions d'exécution :** URLs exactes des routes déduites du code PR #176; utiliser uniquement un harnais de test qui masque les cookies et les corps de réponse; aucun dump de requête; effectuer les scénarios de révocation en fin de campagne et reprovisionner uniquement via le workflow approuvé. Tester d'abord le refus sans cookie, puis le parcours autorisé fictif, puis les refus croisés. Ne pas considérer un 404 de route inexistante comme un test d'autorisation réussi.

## Gate

Les tests hors ligne (SQL mocké et transports interceptés) ne remplacent pas cette campagne HTTP. **NO-GO** tant que la cible PR #176 et les preuves HTTP ne sont pas attestées. Les changements de dépendances candidats sont validés uniquement si `tsc`, `next build`, les tests Recette et les tests existants passent, dans un espace temporaire sans changement du lockfile de la branche.
