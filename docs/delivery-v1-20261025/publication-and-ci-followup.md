# Publication GitHub et recettes CI — suivi du 25 octobre 2026

Deux branches sont publiées, avec SHA distant vérifié et PR ouvertes en Draft :

- [Clara OS #209](https://github.com/gildaspro5613-code/clara-os/pull/209), base consolidation/clara-os-clean-base, premier SHA publié 9e163242bf997417ce7ad1ae5f385ef148018c4f.
- [Clara Live #335](https://github.com/gildaspro5613-code/clara-live/pull/335), base deploy/clara-live-api, SHA 3da5168d30c35b0b2fd999ccdd50d898ae29c8db.

Les protections historiques ont été réutilisées, sans changement de configuration. Voir publication-protection-evidence.md. Aucun merge ou déploiement volontaire. Zéro entrée de déploiement GitHub OS au contrôle du premier SHA ; API déploiements GitHub Live refusée en lecture (403), limite conservée et non transformée en preuve d'absence.

## Premier passage CI OS : 6 SUCCESS / 2 FAILURE

- [Documents Workspace V2](https://github.com/gildaspro5613-code/clara-os/actions/runs/40181857618) : contrats Documents/archives, TypeScript, lint et build réussis ; échec à la recette navigateur.
- [Native authority](https://github.com/gildaspro5613-code/clara-os/actions/runs/40181857667) : SQL, droits, conversations, Stage, callbacks, lint, TypeScript et build réussis ; annotation accessible : 5 recettes natives réussies, 1 échec IONOS pendant la préparation du brouillon.
- Les six autres contrôles du premier SHA sont SUCCESS. Ce sont des résultats du premier passage, pas des résultats anticipés du commit correctif.

## Causes démontrées et corrections limitées aux fixtures

1. Documents : la réponse simulée à `/api/documents?action=references` était une liste de fichiers sans missionId ni connectionId. Le contrat reçu de readNativeDocument exige ce contexte avant un POST. Reproduction locale : 6 PASS, 2 FAIL sur les huit tests de l'étape. Correction de la seule fixture de composant pour fournir les identifiants explicitement synthétiques ; ajout d'un test prouvant qu'un contexte absent bloque le POST et d'assertions sur l'operationId et l'ordre de précontrôle. Vérification ciblée : **7 tests Documents navigateur PASS**, sans suppression d'assertions.
2. IONOS : l'ancien fournisseur simulé renvoyait subject/body sans le champ language obligatoire de #207 ; la validation échoue fermée avant d'afficher le brouillon. Les assertions attendaient aussi un texte non signé, malgré le contrat signé reçu. Correction du fournisseur simulé : langue anglaise explicite, contrôle exact du texte signé pour la boîte concernée. **Recette IONOS navigateur avec vrais handlers/SQL et SMTP simulé : PASS**, incluant délégation, approbation, reprise et résultat incertain sans double envoi. Aucun SMTP réel.

Aucun fichier applicatif, contrat, garde, workflow ou paramètre fournisseur modifié. Aucun test ignoré ou désactivé. Pas de relance manuelle de workflow : un seul push correctif est préparé pour ces échecs reproduits ; la CI automatique du nouveau SHA reste à consulter sur la PR.

## CI Live : limites restantes

Sur le premier et seul SHA Live publié : 11 checks SUCCESS, 2 FAILURE. Les échecs sont localisés à « Sound and Video actual HTTP Mongo PDF and cold reopen » (run 40181884802) et « Existing Library and MVR browser recipes on the Light consolidation » (run 40181884721). Les téléchargements de logs/artefacts sont refusés depuis cette instance. La recette Sound/Video a été rejouée localement, sans modifier Live ni ses preuves historiques : **1 PASS**, vrais HTTP/Mongo/PDF et redémarrage. La recette Library/GDTF/MVR correspondante a également été rejouée localement : **3 PASS**, dont les refus de conflits et profils manquants, sans modification de Live ou de ses preuves historiques. Ces passages locaux n’expliquent pas les FAIL CI ; aucune cause d’environnement n’est déclarée prouvée.

L'action minimale si les détails CI restent inaccessibles est de consulter les étapes échouées et leurs XML JUnit via les deux runs GitHub existants. Aucun nouvel accès Vercel ni reconfiguration des quatre projets n'est nécessaire. Ne pas modifier l'application ou les assertions à partir d'une hypothèse. L'état final des nouveaux checks OS et la qualification Live sont conservés dans le reçu post-publication / les descriptions de PR.

Les mentions « aucun push » et « CI non exécutée » du dossier initial décrivent la réception prépublication. Ce suivi les complète : la conservation GitHub est désormais effective. Les preuves locales de 250 tests et quatre recettes restent conservées ; elles ne sont pas confondues avec les nouveaux checks CI.

Production NO-GO. Aucun déploiement de recette n'est demandé ni autorisé par ce suivi.
