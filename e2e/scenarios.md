# Scénarios E2E — Phase 1

Ces scénarios couvrent les critères d'acceptance de la section 12 du CDC qui
nécessitent un appareil Android physique. L'automatisation Detox sera branchée
sur ces mêmes scénarios une fois le build de développement installé sur
l'appareil (`npx expo run:android`).

## ACC-05 — Reprise après crash

1. Démarrer une session (briefing complet → entretien).
2. Saisir une note, marquer 2 questions `couvert`.
3. Attendre > 30 s (un cycle d'autosave [REL-01]).
4. Tuer l'application (arrêt forcé Android).
5. Relancer l'application, s'authentifier.
6. **Attendu :** la session est rechargée en état `in_progress`, les statuts
   et les notes autosauvegardées sont présents (perte < 30 s) [REL-02].

## ACC-06 — Cold start

1. Arrêt forcé de l'application, vider de la RAM.
2. Lancer l'application, chronométrer jusqu'à l'écran de verrou biométrique.
3. **Attendu :** < 2 s (seuil critique 3 s) sur l'appareil de développement.

## ACC-07 — Parcours complet one-handed [UX-CRIT-01]

Réalisable entièrement d'une seule main, pouce uniquement, sans fixer l'écran
plus de 2 s consécutives :

1. Briefing : sélectionner mission / domaines / application / interlocuteur /
   durée (puces en zone basse), démarrer.
2. Entretien : naviguer par swipe horizontal (suivant) et vertical (revenir)
   [ENT-02], marquer `couvert` / `a_approfondir` / `non_obtenu` [ENT-09],
   activer le mode silencieux en un tap [ENT-08], en sortir, terminer.
3. Analyse : ajouter une assertion, la valider [ANAL-04].
4. Export : générer le Markdown, vérifier le partage natif [EXP-05].
5. **Attendu :** aucune interaction requise hors de la zone de pouce
   (60 % bas de l'écran).

## ACC-04 — Zéro octet réseau

1. Installer le build de production (`APP_ENV=production`, [INVARIANT-05] :
   permission `INTERNET` absente du manifest — vérifiable via
   `aapt dump permissions app-release.apk`).
2. Faire transiter l'appareil par un proxy (mitmproxy) pendant une session
   complète briefing → export.
3. **Attendu :** aucune requête émise par `com.auditia.assistant`.

## ACC-02 / ACC-03 — Verrou d'export et intégrité (déjà automatisés)

Couverts par les tests unitaires/intégration `features/analysis/analysis.test.ts`
et `features/export/export.test.ts` ; à revérifier manuellement sur appareil :
le bouton d'export reste grisé tant qu'une assertion n'est pas validée.
