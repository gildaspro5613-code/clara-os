# Approbation spatiale — interface OS additive

Base vérifiée : PR #203, 7e7b1ce7607e4fd70b9e5da06f9d527dd745a683. Branche dédiée integration/p0-stage-approval-ui ; la PR #203 n'est pas modifiée.

Ajout GET /stage-approval : écran d'approbation explicite depuis la fenêtre ouverte par Live. Réutilise exclusivement POST /api/native/stage action approve, la session native sélectionnée et l'autorité stage:light:mutate:v1 existantes. Aucun nouveau writer, contrat SQL, capacité, grant implicite ou connecteur. Le droit Light et les associations OS/Live doivent déjà être configurés et consentis ; cet écran n'administre pas les droits.

L'origine de retour doit correspondre à l'origine CLARA_LIVE_CALLBACK_BASE_URL configurée. Cookie natif obligatoire, sessions external refusées, CSP à nonce, no-store, no-referrer et interdiction iframe. Le nonce de décision n'est conservé qu'en mémoire, transmis uniquement à l'opener attendu par postMessage ciblé, jamais en URL ni dans les preuves. Live vérifie origine, fenêtre, intention et session avant consommation. La fixture HTTP bilatérale expose le même handler GET réel ; aucune décision OS n'est fabriquée dans la recette d'intégration.

Tests locaux : 7 tests Node PASS (UI négative, routes Stage, PostgreSQL Stage, registre/lock order, voix). TypeScript et lint ciblé PASS. La recette navigateur bilatérale côté Live génère deux révisions et un PDF WebGL archivé/réouvert avec les véritables handlers OS et PostgreSQL jetable.

Le build OS standard est BLOCKED dans cet environnement : Google Fonts Geist/Geist Mono inaccessibles sous la politique réseau. Aucun contournement ni remplacement de police. La CI native historique OS #203 reste rouge : huit échecs Google Agenda/Drive préexistants sur 01e3d25, distincts du contrat spatial ; aucun fichier Google n'est modifié. Référence : https://github.com/gildaspro5613-code/clara-os/actions/runs/39827884554.

La nouvelle CI ciblée vérifie uniquement ce périmètre fermé et ne remplace pas la CI globale. vercel.json désactive explicitement cette branche avant publication. Aucun merge, migration distante, Preview, déploiement ni commande matérielle.

GO interface/contrat en isolation avec autorisations et liens préconfigurés. NO-GO Production et certification fournisseur. Voir le rapport d'intégration Live pour les SHA/PR liés et les preuves métier ; archives GDTF/MVR synthétiques seulement.
