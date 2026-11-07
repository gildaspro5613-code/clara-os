# Clara OS — réception groupée Brevo / Make / Stripe (7 novembre 2026)

Périmètre : **un seul lot Clara OS**, sans fonctionnalité nouvelle, sans refonte graphique, sans déploiement Preview. Réutilise les fichiers de la PR Make #249 sans fusionner #249. Aucun secret n'est stocké dans le dépôt.

## Brevo
Le connecteur OAuth2 et les capacités READ existent déjà. Le hub Connexions affiche le statut réel de l'enregistrement et n'offre le lien de consentement que si les paramètres OAuth existent et les scopes sont exactement READ.

Dans **Vercel → projet clara-os → Settings → Environment Variables → Production** (valeurs à renseigner par le propriétaire ; jamais dans GitHub ou dans une conversation) :
- \`BREVO_CLIENT_ID\` : identifiant de l'application OAuth privée Brevo ;
- \`BREVO_CLIENT_SECRET\` : **secret OAuth** (pas la clé API Brevo) ;
- \`BREVO_REDIRECT_URI\` : \`https://os.melodie.digital/api/connections/brevo/callback\` (à enregistrer aussi dans l'application Brevo, identité exacte) ;
- \`BREVO_OAUTH_SCOPES\` : \`contacts:read campaigns.email:read transactional.email:read\`.

Ne pas renseigner une API key sous \`BREVO_CLIENT_SECRET\`. API-key et OAuth sont deux contrats différents ; l'adaptateur existant utilise \`Authorization: Bearer\`. Toute modification des variables Production exige une nouvelle livraison autorisée pour la recette.

Étapes : config en Production par le propriétaire → déploiement autorisé → authentification à Clara → connexion OAuth Brevo → lecture réelle des contacts, modèles et campagnes à partir de la capacité native sous autorité, révocation et journal → seulement ensuite demander la préparation de campagne. Aucun envoi tant que consentement/approbation métier non certifiés.

## Make
Reprise intégrale du raccord READ de la PR #249, sans import des modèles Live et sans exécution de scénario ici. Les scénarios restants doivent être autorisés et catalogués dans le contexte de la mission. Dans le clone Neon \`br-nameless-dew-b2v6asgj\`, le rôle SQL \`clara_make_runtime_test\` est volontairement **NOLOGIN** et doit le rester. Il faut un **autre** rôle LOGIN de service avec droits minimaux pour la session recette. La connexion Vercel Recette → clone est non certifiée, 0 grant et 0 scénario actif : la chaîne \`grant → READ → revoke\` est **NO-GO** jusqu'à vérification. Ne pas utiliser Production pour ce cycle.

## Stripe / Studio
Clara OS possède les capacités \`stripe.subscription.read\` et \`stripe.payment.read\`, mais la [PR Studio #22](https://github.com/gildaspro5613-code/melodie-digital-site/pull/22) demeure Draft. Le checkout Studio, le journal durable signé et l'autorité canonique du récepteur ne sont pas certifiés. Aucune lecture Stripe *venant de Studio* n'est donc revendiquée. Le hub affiche explicitement **non certifié**, sans activer encaissement, remboursement, abonnement ni paiement. La lecture Studio sera reçue **uniquement** après autorité du journal et raccordement d'une source vérifiée en lecture seule, sans second système de facturation.

## GO / NO-GO
- Merge : NO-GO avant CI et revue. Déploiement Production : GO distinct requis.
- Réception Brevo : NO-GO sans OAuth sécurisé + résultats fournisseur réels + absence d'envoi.
- Réception Make : NO-GO sans session authentifiée sur clone et audit de révocation.
- Réception Studio Stripe : NO-GO avant preuve du journal canonique / source Studio.
- Les secrets ne sont ni demandés dans le chat ni imprimés dans les logs.

Aucun changement de droits Google, aucun changement de données IONOS, aucun changement de code Clara Live.
