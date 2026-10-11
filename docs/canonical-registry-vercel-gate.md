# Publication GitHub : protection Vercel à contrôler

Statut : **BLOCKED pour la publication**. L'utilisateur a confirmé que Vercel est réservé à la production et a demandé de garder les branches locales si les réglages ne peuvent pas être vérifiés. Les nouvelles branches n'ont donc pas été poussées et aucune nouvelle PR n'a été ouverte.

Vérification en lecture seule réalisée : aucun connecteur Vercel disponible ; aucune authentification API Vercel ni identification de projet/team disponible dans l'environnement. Aucune valeur secrète n'a été affichée ou demandée. Les statuts GitHub des derniers commits existants indiquent « Canceled by Ignored Build Step » pour OS, Live frontend et Live API ; ces annulations ne prouvent pas le prédicat appliqué à de nouvelles branches.

Contrôler, sans modifier les réglages :

1. Projet [clara-os — Settings / Git](https://vercel.com/melodie-digital/clara-os/settings/git).
2. Projet **clara-live** — Settings → Git.
3. Projet **clara-live-api** — Settings → Git.

Dans chaque projet, lire **Ignored Build Step** : la règle doit explicitement annuler tous les builds non production, y compris les branches `feat/canonical-registry-v1` et `feat/canonical-links-v1`. Un mode automatique qui ne saute que les commits sans changements pertinents ne constitue pas cette garantie. Dans le même panneau, vérifier **Production Branch** : aucune nouvelle branche de fondations ne doit y être choisie.

Sémantique du réglage Ignored Build Step : code de sortie **0** = ignorer/annuler le build ; **1** = poursuivre le build. Exemple de prédicat à comparer au réglage existant, **pas une modification effectuée** :

```sh
if [ "$VERCEL_ENV" = "production" ]; then exit 1; else exit 0; fi
```

Il doit donner 0 pour Preview et 1 pour Production. Si le réglage actuel équivalent est confirmé pour les trois projets, les deux branches pourront être publiées et deux PR **en brouillon** empilées sur les branches existantes seront ouvertes. Si ce n'est pas le cas, tout changement de réglage demande l'accord de l'utilisateur ; aucune correction de configuration n'est effectuée ici.

Les bases des PR #171/#294 restent inchangées. Aucun merge ni déploiement production n'est autorisé. Les statuts d'annulation d'anciens commits ne sont pas utilisés comme une permission de tester la règle en poussant une branche.


## Autorisation de publication — 11 octobre 2026

L’utilisateur confirme avoir vérifié, sur clara-os, clara-live et clara-live-api, **Settings → Build and Deployment → Ignored Build Step → Only build production**. Il autorise uniquement la publication GitHub des branches dédiées et de leurs PR en brouillon. Le blocage de publication décrit précédemment est levé ; aucun merge, déploiement ou migration de production n’est autorisé. Les statuts Vercel des nouveaux commits seront contrôlés après publication.
