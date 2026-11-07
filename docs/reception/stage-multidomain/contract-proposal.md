# Proposition de contrat Stage multimétier — NON ACTIVÉE

Base OS #204 `cbb683d85e291415b4616aab6eb28eb7692c77a6`, dépendante de #203 `7e7b1ce7607e4fd70b9e5da06f9d527dd745a683`. Liée à la réception Live issue de #327. Cette PR prépare une décision de contrat ; elle n’implémente, n’accorde ni ne certifie aucune autorité nouvelle. Aucun schéma SQL ou route exécutable n’est modifié.

## Autorité actuelle, preuves précises

- `src/lib/canonical/stage-authority.ts`, `approve` : exige exactement `clara.stage-intent.v1` / `stage:light:mutate:v1`, après `authority.current` et inspection serveur Live. Le navigateur n’est pas une autorité canonique.
- `db/migrations/027_canonical_stage_decisions.sql`, `clara_registry_stage_command` : opérations fermées `list`, `grantLight`, `approve`, `claim`, `inspect`, `settle`, `revoke` ; `can_manage` client/projet ET `can_mutate_light`, identité et session natives non révoquées. Décision à usage unique et expiration 45 secondes ; nonce haché ; vérifications à l’approbation et au claim/settle. Un changement de session n’autorise pas une nouvelle redemption.
- `src/app/api/core/canonical/stage/route.ts` et `src/app/api/native/stage/route.ts` : authentification native/produit, origine et sélection workspace/client/projet explicites, capability produit indépendante du rôle humain.
- Live `backend/stage_model/canonical_mutation.py` : `Placement` n’accepte que fixtureId/position/rotation ; `Prepare` interdit les champs inconnus. Le writer unique garde les objets non ciblés, les sources attestées et le même document tête/historique/reçus via CAS atomique. Une lecture, vue, export ou classification projet ne dispose pas du droit d’écrire.

La classification des projets en cinq métiers ne modifie aucune de ces permissions. Sound/Video/Structure/Production n’héritent pas de Light.

## Proposition minimale à valider, séparément du v1

Un nouveau contrat versionné serait nécessaire. Ne pas élargir le sens de `stage:light:mutate:v1`, de `grantLight`, de `can_manage` ou d’une licence. Conserver le v1 inchangé pendant la transition.

### Enveloppe proposée (aucun nom ci-dessous n’est une capability active)

- schemaVersion explicite v2 et version du validateur ; opération(s) discriminées ; domaine auteur parmi Light/Sound/Video/Structure/Production ; refus de toute combinaison domaine/type non répertoriée.
- acteur Live/OS, produit, workspace, client, projet et préparation vérifiés des deux côtés ; preuve d’identité et de projet révoquable, sélection native persistante sans repli global.
- operationId idempotent lié à l’acteur et à ce périmètre ; expectedStageRevision ; références exactes des contributions métier/patch/catalogue/documents ; digest canonique de la proposition complète et du diff ; provenance par objet et par opération.
- mêmes conventions Clara, mètres et degrés ; origine/axes attestés ; aucune valeur implicite pour une position, une orientation, une dimension ou une capacité inconnue.
- approbation OS native du diff exact, droit explicite pour domaine/opération, expiration, nonce à usage unique ; contrôle du droit avant préparation, approbation, claim et commit ; reçu liant parent, nouvelle révision, modèle, opération, auteur et décision.
- même writer Live et même CAS tête/historique/reçus. Jamais cinq modèles, un writer parallèle, Product Baseline ou callback Unified Core non canonique. Les contributions des autres métiers doivent rester octet pour octet identiques hors cibles attestées.

### Opérations et limites

| Opération proposée | Cible et préconditions | État actuel |
|---|---|---|
| Créer la première implantation Light | instances déjà dans le patch, GDTF/mode vérifiés, surface/poses déclarées | v1 autorisé |
| Ajouter une implantation Light absente | même instance projet/catalogue, nouvel objet sans collision d’identité, patch enregistré | v1 autorisé, recette Live dédiée |
| Déplacer/pivoter Light | pose uniquement, sources et parent exacts | v1 autorisé |
| Reprendre des poses historiques | lecture attestée puis brouillon sur la tête actuelle, nouvelle décision et CAS | v1 autorisé ; aucun retour automatique de tête |
| Créer/dupliquer une instance | UUID nouveau, catalogue inchangé, nouvelle entrée projet et patch explicites ; jamais copier l’identité | pas de contrat actuel |
| Retirer une implantation | retrait/tombstone spatial versionné, sans supprimer l’instance projet ni le patch ; revue explicite des cues et documents liés, sans effacement d’historique | pas de contrat actuel |
| Supprimer une instance projet | inventaire complet des dépendances et cohérence atomique des documents distincts | bloqué ; ne pas assimiler au retrait spatial |
| Changer un support | support autorisé du même projet, pas de cycle, orientation/transformations explicites, aucun recalcul structurel certifiant | pas de contrat actuel |
| Changer le rattachement Light/DMX | digest du nouveau run/patch, mode et empreinte attestés, différences explicites et revue des cues ; aucune fausse translation | pas de contrat actuel ; `STAGE_NO_SPATIAL_CHANGE` conservé |
| Contribuer Sound/Video | références Library pertinentes (GDTF non universel), identités d’instances, objets/poses typés et sources documentées | pas d’autorité actuelle |
| Contribuer Structure | géométrie et relations autorisées uniquement ; jamais approbation de charge/levage/stabilité | pas d’autorité actuelle |
| Contribuer Production | annotations/zones/coordination typées ; aucune prise de propriété des équipements d’un autre métier | pas d’autorité actuelle |

Mode DMX : propriété de configuration de l’instance et du patch (univers/adresse/empreinte) ; une modification de canal n’est pas un déplacement. Si le Stage référence ce run pour rendu/documents, son rattachement doit recevoir une nouvelle révision approuvée même sans delta de pose, via une opération distincte. Les cues doivent être explicitement revus contre les nouvelles capacités et leur historique conservé. Une géométrie modifiée par le mode exige une ressource attestée ; ne pas la supposer équivalente.

## Cohérence, concurrence et suppression

CAS atomique du Stage ne suffit pas, à lui seul, à rendre atomique une suppression qui touche patch, cues et préparations dans d’autres documents Mongo. Toute suppression d’instance globale reste refusée tant que le mécanisme de dépendances et sa transaction/fence entre writers existants ne sont pas spécifiés et reçus sur le déploiement concerné. Aucun verrou fictif ou migration de topologie ne doit être introduit pour la recette. Un retrait spatial ne retire pas silencieusement le patch ; les anciennes archives PDF et versions restent immuables et les programmes liés à un ancien snapshot deviennent périmés.

Conflit : HTTP409, brouillon et base d’origine conservés ; relecture/réexamen explicites avant nouveau diff/décision. La reprise d’une ancienne révision ne rebascule jamais automatiquement un brouillon concurrent sur une tête plus récente. Identifiant retiré non réutilisable pour un autre équipement.

## Réception nécessaire avant activation

1. Tests bilatéraux vrais handlers OS/PostgreSQL ↔ Live/Mongo : chaque opération et domaine autorisés, premier modèle puis nouvelle révision, reprise après arrêt, reçu perdu et requête idempotente.
2. Refus acteur/workspace/client/projet/préparation étrangers, objet/support/catalogue étrangers, session absente/expirée, produit sans capability, droit humain révoqué avant claim/commit, nonce rejoué, digest altéré, parent concurrent.
3. Deux modifications concurrentes ciblant des métiers différents : exactement un commit par tête attendue ; aucune fusion silencieuse ni perte de contribution. Repréparation explicite pour la seconde.
4. Retrait : cues/patch/documents/historique préservés ; référence périmée refusée pour export courant ; cycles de support et suppression avec dépendances non traitées refusés.
5. Matériel : zéro émission, show, commande console ou route Connector Runtime non autorisée.

Les tests v1 existants et les preuves bilatérales de Live vérifient l’autorité actuelle ; ils ne certifient pas cette proposition non implémentée. CI globale OS : les échecs Google préexistants restent distincts et non modifiés. Aucun GO multimétier, merge ou déploiement découle de cette PR documentaire.
