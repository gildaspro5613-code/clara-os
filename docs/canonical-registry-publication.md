# Publication des fondations — 11 octobre 2026

Statut : **READY FOR REVIEW**. Publication GitHub seule effectuée, après confirmation par l’utilisateur de « Settings → Build and Deployment → Ignored Build Step → Only build production » sur les trois projets Vercel.

| Dépôt | PR en brouillon | Branche | Base |
|---|---|---|---|
| Clara OS | [#172](https://github.com/gildaspro5613-code/clara-os/pull/172) | `feat/canonical-registry-v1` | `feat/clara-os-documents-workspace-v2` |
| Clara Live | [#295](https://github.com/gildaspro5613-code/clara-live/pull/295) | `feat/canonical-links-v1` | `feat/secure-os-live-archive-contract` |

PR existantes #171 et #294 toujours en brouillon, bases et commits d’origine préservés (`00b6324` et `d2e9ede`). Aucun merge, déploiement production ou migration production.

Sur les commits initialement publiés `4eea1fa` (OS) et `f0f62de` (Live), les statuts Vercel OS, clara-live et clara-live-api indiquent **Canceled by Ignored Build Step**, état success. Les builds Preview ont été annulés. Le check « Vercel Preview Comments » est un check d’intégration GitHub ; son nom ne prouve pas l’exécution d’un build. Aucun déploiement GitHub associé trouvé pour OS ; la lecture des déploiements Live est interdite par l’intégration (403), donc la vérification Live repose sur les statuts Vercel accessibles.

Les tests ont été exécutés avant publication ; aucun code applicatif n’a été modifié lors de la publication, seulement les rapports. Ciblé Live 40 réussis ; PostgreSQL/service OS 2 scénarios réussis ; Documents OS 28 réussis/1 ignoré historique ; GDTF/Video/certification Stage 22 réussis/1 fixture réelle ignorée ; builds/types/lint ciblé réussis ; Chromium Documents 6 + archives 1 + Stage 2D/3D + Sound/Video réussis. Suites larges : backend 309 réussis/9 échecs, HTTP métier 40 réussis/20 échecs, frontend 170 réussis/1 échec ; tous ces échecs préexistants reproduits sur les snapshots de départ. CI GitHub distincte, consultable sur les PR.

Détails : [architecture et opérations administratives](canonical-registry-implementation.md), [résultats et reproduction](canonical-registry-validation.md), [contrôle Vercel](canonical-registry-vercel-gate.md). L’activation réelle exige encore les migrations additives et les liaisons/ACL explicites après autorisation ; aucune connexion de production, aucun service Google/Drive réel et aucun matériel physique n’est déclaré validé.
