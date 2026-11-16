# Validation #216 et périmètre de preuve

Base 242560261f91d5f32790191d989e321dfa71d757. Source applicative fdfe1136f88132733370306d99b0ae0607682288. Les commits documentaires suivants ne changent pas le source testé.

- Contrat natif + i18n : 12 PASS (5 tests nouveaux, 7 tests i18n existants), evidence/unit-i18n.txt.
- ESLint ciblé composants Connexions et tests google-native-hub* : code de sortie 0, evidence/lint-targeted.txt (vide lorsque réussi).
- Build Next.js 16.4.3 et vérification TypeScript : code de sortie 0, evidence/build-typescript.txt. Aucune dépendance modifiée.
- Réception navigateur finale : 1 PASS, 0 FAIL (87,36 s), 12 captures et résultats dans evidence/browser/ ; journal evidence/browser-accepted.txt. Les cas ?google=connected avec liste vide et HTTP 401 sont inclus.
- Le test navigateur utilise Chromium, le build optimisé, le proxy TLS et les vrais handlers/SQL natifs sur une base PostgreSQL jetable. Aucune base distante.
- Les réponses Google non natives restantes sont des fixtures de présentation, ainsi que Microsoft et Make. Les captures ne certifient pas ces fournisseurs.
- Aucun changement src/app/api, src/lib, db/migrations, package.json ou package-lock.json par rapport à la base (git diff --exit-code).
- Les journaux texte sont normalisés uniquement pour les retours de ligne/progress bars et espaces de fin de ligne (git diff --check), sans changement des résultats.
- Les traces des deux erreurs de test locales sont conservées : locator Make ambigu puis variable hors portée dans un scénario ajouté. Pas de retries automatiques ni durée augmentée.

## Publication et sécurité

Protection historique : docs/delivery-v1-20261025/publication-protection-evidence.md. Only build production et absence de tracking de cette branche sont des attestations historiques réutilisées, pas une nouvelle lecture Vercel. vercel.json ajoute uniquement git.deploymentEnabled[fix/google-native-hub-216]=false, conservant les exclusions et crons. Les workflows de déploiement restent manuels ; aucun workflow de déploiement lancé. La modification du workflow natif ajoute seulement les contrôles ciblés et la recette hub sur données jetables fraîches.

Aucun fichier de secret, TLS privé, cookie, contenu de message ou donnée réelle exporté. Aucun provisionnement ou SQL Production exécuté. Le modèle SQL IONOS est préparatoire, paramétré et non exécuté.

Les CI finales, leur SHA et les déploiements observables GitHub sont rapportés dans la description de PR et ses Checks après leur achèvement. L'absence d'entrée GitHub ne constitue pas une inspection exhaustive de Vercel. Aucun merge ni déploiement autorisé.

Contrôle avant publication : aucun motif de credential réel dans les fichiers modifiés. Le seul motif URI SQL repéré est la configuration de fixture préexistante synthetic@documents-e2e.invalid dans le workflow, inchangée. git diff --check contrôlé sur le delta complet.
