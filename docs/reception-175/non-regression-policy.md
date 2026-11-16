# Politique permanente de non-régression Clara OS

Cette politique s'applique à tout futur développement, correctif et raccord Clara OS.

1. Avant modification, identifier le commit de départ, les parcours existants impactés, leurs contrats, sources de données, permissions et preuves positives/négatives. Distinguer code présent, raccord, simulation, isolation réelle, verrouillage et certification Production.
2. Réutiliser prioritairement les services, stores, composants et contrats existants. Une réécriture ou nouvelle architecture exige une nécessité démontrée ; une barrière temporaire ne justifie pas un adapter parallèle.
3. Tester positivement chaque capacité modifiée et négativement les accès sans session, expirés, révoqués, inter-utilisateurs, clients/projets et versions concurrentes pertinents. Ne jamais enlever une barrière, désactiver un test ou modifier une décision métier pour obtenir du vert.
4. Exécuter les tests pertinents des parcours précédemment validés, notamment le cœur natif, la continuité commerciale, les documents, les langues et OS↔Live. Employer les workflows existants plutôt que multiplier les workflows. La CI native doit exécuter les stores PostgreSQL et les parcours navigateur commerciaux avec providers simulés.
5. Vérifier la persistance et la reprise après rechargement et changement de session authentifiée. Les décisions, Mission, Journal, conversation et brouillon doivent être cohérents ; refuser les conflits au commit. Aucun rapprochement historique par email/nom/titre/dernier record.
6. Une régression démontrée bloque la réception jusqu'à correction testée. Identifier séparément les échecs préexistants : baseline, impact, preuve et décision. Ne pas masquer un échec global avec une CI ciblée verte.
7. Documenter le commit testé, les commandes, résultats/counts/ignored, scopes réels ou simulés, barrières conservées et limites. Une CI verte ne constitue jamais une certification fournisseur/Production.
8. Respecter l'autorisation du chantier pour branches, PR, migrations, configuration, secrets et opérations externes. En réception #175 : PR #176 Draft, aucune Production/Preview, migration Production, envoi ou appel fournisseur sans accord explicite.

## Gate de clôture

GO isolé uniquement si le parcours positif complet et ses refus passent avec persistance métier réelle ; les non-régressions applicables doivent passer ou être qualifiées explicitement comme préexistantes sans impact sur le parcours reçu. GO Production exige séparément configuration, sauvegarde, droits effectifs et recette autorisée réelle. Une capacité facultative fermée n'est pas un blocage du cœur si le périmètre de réception la reporte explicitement.

## Clara Live

Prévoir l'adoption de cette même politique dans un chantier distinct Clara Live : inventaire de ses parcours validés, tests Stage Model/pages métier/bibliothèque/connecteurs et contrats OS↔Live. Ce document ne modifie pas le dépôt Live et ne prétend pas y instaurer une politique déjà appliquée.
