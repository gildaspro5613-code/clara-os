# Clara OS — Prompts multilingues

> **LOT A — Structure only.**  
> Ce dossier sera développé dans le **LOT C — Clara / Prompts / Contexte linguistique**.

## Stratégie prévue (LOT C)

Les prompts Clara doivent refléter la langue active de l'utilisateur tout en
conservant la cohérence sémantique attendue par le Brain.

Trois approches seront évaluées lors du LOT C :

1. **Prompts par locale** — un fichier de prompt par langue dans ce dossier,
   chargé dynamiquement selon `Locale`.
2. **Injection de locale** — un prompt maître avec injection de la directive
   `Answer in {locale}` au moment de l'exécution.
3. **Hybride** — structure de base commune + surcharges spécifiques par langue
   pour les parties culturellement sensibles.

## Convention de nommage (à confirmer en LOT C)

```
src/i18n/prompts/
├── foundation.{locale}.md   # ex: foundation.fr.md
├── clara.{locale}.md
└── ...
```

## Avertissement

Ne pas créer de prompts ici avant la validation du LOT C.  
Ne pas modifier le Brain ni le Runtime pour ce dossier.
