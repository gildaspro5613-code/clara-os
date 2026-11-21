<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Politique permanente de non-régression

Appliquer [la politique Clara OS](docs/reception-175/non-regression-policy.md) à tous les futurs changements. Identifier les parcours impactés, réutiliser les contrats existants, exécuter leurs tests positifs/négatifs et de reprise, conserver les barrières d'autorité et bloquer la réception sur une régression démontrée. Rapporter le commit testé, les preuves et les limites ; ne jamais désactiver des tests pour obtenir du vert. Clara Live reste un chantier distinct.

## Conservation des travaux et états de livraison

Aucun travail validé ne doit rester uniquement dans `/tmp` ou un environnement éphémère. Avant de clôturer une mission, enregistrer le code, les tests et les preuves nécessaires dans un commit et vérifier leur conservation dans un emplacement durable autorisé. Si la publication est autorisée, vérifier le SHA de la branche distante et l'accès effectif aux fichiers sur GitHub. Si elle est interdite, conserver un paquet complet dans un emplacement persistant vérifié ; en son absence, signaler explicitement le blocage, sans annoncer le travail comme récupérable. Un commit local situé dans un environnement éphémère ne constitue pas à lui seul une conservation durable.

Toujours distinguer : travail local non sauvegardé ; commit Git enregistré (avec son emplacement) ; commit publié sur GitHub (SHA distant vérifié) ; fusion ; déploiement. Une publication ne vaut jamais autorisation de fusion ni de déploiement. Ne pas inclure de secrets, de clés privées ou de données Production dans les preuves.
