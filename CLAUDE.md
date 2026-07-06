# IT Audit Interview Assistant — Phase 1 (MVP arbre statique, Android)

Application React Native (Expo SDK 57) assistant les auditeurs IT juniors
pendant les entretiens ITGC. Source de vérité : le cahier des charges
`CDC_IT_Audit_Interview_Assistant` v0.3 (spec-driven).

## Commandes

- `npm test` — suite Jest (services testés contre le schéma SQL réel via better-sqlite3)
- `npm run test:coverage` — couverture (seuil 80 % imposé sur `features/`)
- `npm run typecheck` — TypeScript strict, zéro `any` non justifié
- `npm run lint` — ESLint (règle `no-console` bloquante hors tests)
- `npx expo run:android` — build de développement sur appareil physique
- `APP_ENV=production npx expo prebuild -p android` — manifest de production sans permission réseau [INVARIANT-05]

## Architecture (structure imposée par le CDC §4.3)

- `app/` — écrans Expo Router uniquement (briefing / entretien / analyse / historique)
- `components/` — UI pure, zéro logique métier
- `features/` — logique métier par module (briefing, session, analysis, export) ; chaque service reçoit un `DbClient` par injection
- `ai/` — couche IA isolée (prompts versionnés §5.4, stubs Phase 1 en mode `none`) ; aucun accès base
- `db/` — `schema.sql` canonique (§4.4, immuable hors migrations), migrations, client SQLCipher
- `knowledge-base/` — référentiel de questions ITGC (JSON, schéma §11.1)
- `store/` — Zustand (orchestration UI seulement)
- `features/testing/test-db.ts` — adaptateur better-sqlite3 des tests (exclu de la couverture)

## Règles non négociables

- **[INVARIANT-01]** aucune donnée d'entretien ne quitte l'appareil ; pas de permission réseau en production
- **[INVARIANT-02]** aucune assertion n'atteint un export sans `validated_by_user = 1` (verrou `getExportGate`, testé)
- **[INVARIANT-03]** offline-first intégral
- Toute modification de schéma passe par une migration dans `db/migrations/` (et `schema.sql` doit rester identique — test de parité dans `session.test.ts`)
- Commits au format `[SPEC-ID] type(scope): description`
- Chaque `[SPEC-ID]` implémenté doit avoir au moins un test ; les ambiguïtés sont marquées `[CLARIFICATION REQUIRED]` dans le code (voir `buildQuestionTree` pour les conditions d'enfants)

## État des phases

- **Phase 1 (courante)** : livrée — briefing, entretien guidé sans audio, analyse HITL, export MD/DOCX, SQLCipher, biométrie, FLAG_SECURE. LLM en mode `none`.
- **Phase 2** : intégration llama.cpp (les prompts §5.4 et le filtre de confiance [DECISION-07] sont déjà en place)
- **Phase 3** : STT whisper.cpp + portage iOS + export PDF
- **Phase 4** : bloquée par **[OPEN-01]** (gouvernance du référentiel) — ne pas implémenter
