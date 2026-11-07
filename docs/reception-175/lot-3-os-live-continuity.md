# Lot 3 — continuité opérationnelle OS ↔ Live

Décision : **NO-GO en isolation pour le parcours demandé ; NO-GO Production**. Le durcissement du transport OS est testé séparément. Aucun parcours Mission native → capacité Live → résultat attesté → Journal/Cockpit → reprise n'est déclaré rouvert.

Référence OS : `8ba183cec70163f9761814723fe160003441fd28`. Branche `fix/os-operational-reception-175`, PR #176 Draft vers `consolidation/clara-os-clean-base`. Référence Live inspectée en lecture : `48a2f94910d4a6111250e15046e0f471ddd6ac9b`. Le fichier evidence compagnon et les contrôles du dernier SHA de la PR précisent les vérifications réalisées.

## Audit préalable et matrice

| Raccord existant | Fonctionnel / réellement testé | Simulation / blocage | Modification minimale |
| --- | --- | --- | --- |
| `clara.unified-core.event.v1`, `/api/external/events`, jobs documentaires et Work Cycle | Authentification produit, validation, contexte projet, idempotence documentaire : tests de contrat OS | Sens principal Live → OS ; pas une certification de Mission native. Identité Live dans le scope, pas un droit implicite sur un utilisateur OS | Préserver les contrats et stores existants ; ne pas injecter ces événements dans le runtime natif |
| `/api/core/capabilities/execute`, `product-callback.ts` | Callback existant, authentification Bearer + `x-clara-product`, allowlist Live | Jeton produit ≠ consentement canonique utilisateur/client/projet/mission ; aucune attestation d'opération dans le retour | Transport OS borné seulement ; protocole d'autorité à compléter côté Live avant ouverture native |
| Light / `run_project_computation`, `context.task=lighting` | Moteur présent dans `server.py`, résolution préparation validée / documents / données insuffisantes | **BLOCKED** parcours natif. Les calculs métier n'ont pas été exécutés pour une Mission OS dans ce lot | Réutiliser le moteur ; certifier contexte et retour, sans refonte |
| Sound / même capacité, `task=sound` | Moteur audio existant, sélection explicite du domaine possible | **BLOCKED** ; aucune restitution audio native certifiée | Même raccord conditionnel |
| Video / même capacité, `task=video` | Moteur vidéo existant | **BLOCKED** ; aucune analyse/préparation vidéo native certifiée | Même raccord conditionnel |
| Production / même capacité, `task=production` | Moteur production existant, manquants possibles | **BLOCKED** ; aucune coordination durable native reçue | Même raccord conditionnel |
| `get_spatial_readiness` | Route allowlist testée avec exécuteur contrôlé | Lecture spatiale présente ; ni équipements, géométrie, plans, Stage Model ni références documentaires restitués et vérifiés dans une Mission OS | Ne pas afficher de succès Stage ou matériel |
| `apply_stage_proposal` | Écriture gouvernée existante, reconstruction depuis source MVR immuable | Hors ouverture : pas une lecture, pas une exécution physique ; aucun appel effectué | Rester fermé dans le natif |
| Registre canonique, double consentement et archivage | Tests PostgreSQL/Mongo existants séparés | L'archivage utilise un ticket et une clôture spécifiques ; pas une autorisation générique de calcul sur projet ouvert | Ne pas détourner les tickets d'archivage pour exécuter des capacités |
| Autorité physique | Stores/approbations existants, inchangés | Aucune commande console, audio, vidéo, Q-SYS, QLab ou réseau | Aucun élargissement |

## Blocage de contrat précis

Sources Live : `backend/unified_core_capability_routes.py` (`CoreCapabilityIn`, allowlist et enveloppe réponse), `backend/server.py` (`_execute_unified_core_live_capability`, `_run_project_computation_tool`), `backend/canonical_authority_routes.py` (`checked_proof`), `backend/clara_work_cycle_routes.py` (`_capabilities`). Sources OS : `src/lib/external-capabilities/product-callback.ts`, `external-event-handler.ts`, `document-operations.ts`, `src/modules/missions/execute-mission-task.ts`, `src/lib/canonical/registry.ts`, `src/app/api/native/runtime/route.ts`.

1. Le callback attend `userId`, `workspaceId`, `sessionId`, `context`. Dans l'exécuteur Live, `workspaceId` représente le **projet Live**, sauf préfixe `user:`. Transmettre le workspace OS brut serait erroné. Le serveur vérifie l'existence de l'utilisateur Live et la propriété du projet Live ; il ne vérifie pas la correspondance canonique OS ni son état révoqué, une Mission OS ou le consentement d'exécution actuel.
2. Le modèle refuse les champs supplémentaires au premier niveau. Aucune référence d'opération durable n'est exigée ou confirmée. La réponse est `{success,message,result}`. Ajouter des identifiants dans `context` côté OS ne rendrait pas ces identifiants contrôlés par Live.
3. `run_project_computation` n'est pas toujours une lecture : une préparation validée peut entraîner persistance du calcul et rafraîchissement des éléments. Une interruption ne permet donc pas de relancer aveuglément une requête. Le timeout ne prouve jamais l'absence d'effet Live.
4. La vérification de preuve canonique existante expire au bout de cinq minutes : elle sert à confirmer l'association initiale. Elle ne constitue pas un contrat général durable d'autorité d'exécution. Les tickets d'archivage impliquent quant à eux le statut terminé ; les détourner empêcherait les calculs opérationnels sur projets ouverts et changerait leur sens.
5. Sans réponse liée à une opération et à son contexte attesté, OS ne peut pas certifier les réponses tardives/hors ordre, le rejeu, la reprise et la révocation pendant l'appel. Une seconde lecture ne constituerait pas une transaction atomique entre bases.

Ces lacunes nécessitent une coordination côté Live, interdite dans ce lot. Aucune interface fictive, aucun deuxième Unified Core, aucune nouvelle table Mission/Session/projet et aucune migration ne sont ajoutés pour les masquer. Le verrou natif `NATIVE_CAPABILITY_NOT_CERTIFIED` reste en place. Les historiques ne sont pas réattribués.

## Contrat minimal à préparer dans le chantier Live distinct

Étendre de façon rétrocompatible le callback existant, pas créer un second Core. Conserver explicitement le workspace OS et le projet Live comme identifiants distincts. Porter produit authentifié, acteur OS et identité Live liée, client/projet OS, projet Live, Mission/Session OS, capacité et risque, référence d'opération et empreinte des entrées, autorisation courte à audience/capacité/contexte précis et état révocable. Résoudre ces identifiants exclusivement depuis le registre et les consentements existants.

Live doit vérifier ces droits avant calcul, traiter de façon durable l'idempotence et les conflits de contenu pour une même opération, puis rendre un résultat lié à cette opération/contexte, avec statut métier, provenance/références, manquants et version. Prévoir un moyen de consulter une opération interrompue sans la réexécuter. Définir la sémantique de révocation en cours de traitement et la conservation administrative des résultats. OS revalidera son autorité à la réception et au commit CAS des stores Mission/Session/Journal existants ; un résultat réseau seul ne donnera jamais une instruction privilégiée.

Fichiers concernés à examiner côté Live : `backend/unified_core_capability_routes.py`, `backend/unified_core_contracts.py`, `backend/server.py` (adaptateur callback seulement), services canoniques d'autorité et tests correspondants. Aucun changement de ces fichiers réalisé ici. Un stockage d'opérations Live peut être nécessaire : sa conception/migration relève de ce chantier distinct, aucune atomicité distribuée n'est revendiquée.

## Correction OS réellement effectuée

Quatre tests de régression échouaient avant correction : acceptation de `success:true` sans objet résultat, réponse non bornée, absence de politique de redirection/délai et exception réseau non normalisée. Un cinquième test vérifie effectivement l'abandon d'une lecture de corps bloquée après cinq secondes.

La branche `clara-live` du transport existant impose maintenant `redirect:error`, un délai de cinq secondes couvrant également le corps, une limite de 64 Kio avant décodage, un objet résultat et un message borné. Le lecteur est libéré, les exceptions deviennent un refus générique sans détail fournisseur. Aucun retry. Les réponses partielles structurées restent partielles ; succès de transport ne signifie ni complétude métier ni autorité canonique. Le message retourné reste une donnée externe, jamais une instruction à exécuter.

Les autres produits conservent leur transport antérieur. Les tests d'authentification Live et de Work Cycle sont conservés. Le workflow natif existant inclut ces tests et leur lint ; aucun workflow supplémentaire, aucune configuration fournisseur ou Vercel modifiée.

## Recette et preuves

Voir `lot-3-evidence.json` pour les commandes, comptes et résultats. Les tests de transport utilisent un fetch contrôlé ; les tests Python du callback emploient un exécuteur contrôlé, pas les calculateurs complets. Les tests canoniques existants emploient PostgreSQL/MongoDB isolés. Les parcours navigateur des lots 1/2/2 bis restent les parcours existants ; ils ne certifient pas un parcours Live natif nouvellement ouvert.

**Non exécutés / bloqués** : les quatre parcours métier de bout en bout Mission OS → Live → résultat durable natif, la recette UI correspondante, les refus inter-missions et retours forgés/tardifs/hors ordre pour ce futur raccord, la reprise après écriture Live et échec de persistance OS. Ils ne sont pas substitués par les seuls tests de contrats ou d'archivage. L'absence de ces preuves empêche le GO du lot 3.

## Opérations et risques restants

Pas de migration OS nécessaire pour le durcissement de transport ; retour arrière du seul correctif par revert ciblé, sans suppression de données. Le protocole d'opération métier à venir devra être évalué séparément. Les défauts globaux lint/Vitest et vulnérabilités de dépendances déjà qualifiés au lot 2 bis restent distincts ; aucun test désactivé ou version applicative changée ici.

Le timeout retourne un échec de transport nécessitant réconciliation ; il n'est pas une preuve d'annulation Live. Pas de certification Production, de droits Drive transférés implicitement, de secrets consultés, de fournisseur réel, de modification Live, de merge, de Preview ou de déploiement. La PR reste Draft. La réception du lot 3 exige d'abord le contrat d'autorité/reprise Live puis l'intégralité de la recette native demandée.
