<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Politique permanente de non-régression

Appliquer [la politique Clara OS](docs/reception-175/non-regression-policy.md) à tous les futurs changements. Identifier les parcours impactés, réutiliser les contrats existants, exécuter leurs tests positifs/négatifs et de reprise, conserver les barrières d'autorité et bloquer la réception sur une régression démontrée. Rapporter le commit testé, les preuves et les limites ; ne jamais désactiver des tests pour obtenir du vert. Clara Live reste un chantier distinct.
