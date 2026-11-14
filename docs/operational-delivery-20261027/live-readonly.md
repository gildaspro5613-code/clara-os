# Clara Live — référentiel de réception, lecture seule

Inspection du 27 octobre 2026. PR #335 ouverte, HEAD `121769193bb8df72a63e5bc4ec4732a7557d82a7`, 11 contrôles SUCCESS observés sur GitHub. PR #336 ouverte, HEAD `3acc518855cca2f8b29cee82f791bc4af7d20008`. Le checkout existant reste inchangé ; ses fichiers ne sont pas pris comme substitut au SHA de #335 : les preuves sont lues avec `git show 1217691:...`. Aucun test Live rejoué ni fichier Live modifié.

## Acquis à conserver et réception à exécuter sous autorisation distincte

| Parcours | Composants/preuves existantes | Réception opérationnelle requise |
|---|---|---|
| Projets, clients, documents et Clara | docs/delivery-v1-20261025/acquis.csv, validation.md et première journée ; contrats Unified Core | Projet autorisé, document sourcé, conversation puis reprise, refus autre propriétaire |
| Light / Library / GDTF / MVR | docs/reception/lot2bis-light-stage-gdtf-reception.md, lot3-light, tests Library | Archive synthétique identifiée, mode DMX, patch, conservation Stage ; aucun show |
| Sound | docs/reception/lot4/reception.md, backend/tests/test_lot4_browser.py | Patch/routage/version et reprise ; préserver les refus |
| Video | Même réception lot4, preuve commune non additionnée | Sources/routage/conversions et contexte projet |
| Structure/Rigging | docs/reception/stage-structure/reception.md, test_structure_multidomain_reception.py ; matrice domain-delivery-matrix.csv | Objets, poses, accroches, charges déclarées, contraintes, plans, historiques et CAS ; calculs théoriques, jamais certification structurelle |
| Production | docs/reception/lot5-production/reception.md | Coordination/logistique/dossiers et approbations ; ne remplace pas Structure |
| Stage 2D/3D, PDF et archives | docs/reception/integration-p0-proof/rerun-artifacts/lot2-light-stage-documents ; contrats Stage versionnés | Relire la révision exacte après redémarrage, PDF puis archive ; préserver contributions des cinq domaines |
| Consoles | Interfaces et tests existants des intégrations reçues | Préparation/programmation autorisées distinctes du déclenchement d’un show ; aucun matériel sollicité ici |
| OS ↔ Live | clara.unified-core.event.v1, clara.document-analysis.v1, conversation:link ; preuves canoniques existantes | Identités exactes, contexte, révocation, reprise et reçus bilatéraux sur versions déployées attestées |
| Logo officiel Live | frontend/src/components/ClaraLiveMark.jsx → /brand/clara-live-symbol.svg ; commits d3baacd656d36ab06ca3ae0ca2318f0963b9afca et 22287fd49aaa3bd534be05e932bd1c678453d2e3, évolution ed30e3f | Préserver son identité propre ; aucun remplacement par le symbole OS |

Les 11 contrôles comprennent les workflows Library, Stage, Business Workspaces, frontend, backend, Mongo et protocoles. Liens vérifiables : https://github.com/gildaspro5613-code/clara-live/pull/335/checks . Ce sont des preuves techniques, pas une nouvelle certification fournisseur, archive fabricant, matériel ou déploiement Production.

**Préparation technique historique disponible. Réception opérationnelle actuelle NON ATTESTÉE ici.** Les destinations frontend/API/Mongo/Blob et JWT doivent être celles de l’installation effectivement autorisée ; les réserves du plan déployé existant ne sont ni effacées ni transformées en défaut fournisseur. Toute intervention Live exige sa propre autorisation.
