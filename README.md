# Welcome on AuditIA

## Objective
To allow IT auditors to lead faster interviews and not come back with more questions

## How it works 
Development in progress: Capture the exchange between people and know what risk are filled by this conversation (and if the IT auditor should ask some questions before the end of the interview) and what documents the IT auditor should ask after the interview.
Current state: Android only application

---

## Phase 1 — MVP arbre statique (livrée)

Implémentation conforme au CDC v0.3 (`CDC_IT_Audit_Interview_Assistant`),
Android uniquement, 100 % offline, sans LLM (mode `none`, [DECISION-05]).

### Modules

| Module | Contenu | Specs |
|---|---|---|
| 1. Briefing | Type de mission, domaines ITGC, application, interlocuteur, durée ; l'arbre décisionnel est filtré selon ces choix | BRIEF-01..05 |
| 2. Entretien guidé | Questions-suggestions, swipe suivant/revenir, statuts couvert / à approfondir / non obtenu, notes, couverture temps réel, mode silencieux, autosave 30 s | ENT-01..02, 05..06, 08..09, REL-01..03 |
| 3. Analyse | Couverture finale par domaine, gaps, assertions avec validation humaine obligatoire (Valider / Modifier / Supprimer) | ANAL-01..02, 04 |
| 4. Export | CR Markdown et DOCX (template §11.3), horodatage ISO 8601 + hash SHA-256, partage natif uniquement | EXP-01..03, 05 |

### Sécurité

- SQLite chiffrée **SQLCipher AES-256**, clé 256 bits dans le Keystore Android (`expo-secure-store`)
- **Biométrie obligatoire** au démarrage (repli code appareil)
- **FLAG_SECURE** (anti-capture d'écran) sur les écrans de session
- Builds de production **sans permission réseau** (`APP_ENV=production`, [INVARIANT-05])
- Aucune assertion exportée sans validation humaine tracée ([INVARIANT-02])
- Suppression de session définitive et immédiate, sans corbeille (§6.2)

### Développement

```bash
npm install
npm test                 # 88 tests, schéma SQL réel (better-sqlite3)
npm run test:coverage    # seuil 80 % sur features/
npm run typecheck        # TypeScript strict
npm run lint             # ESLint + no-console

npx expo run:android     # build dev sur appareil physique (USB)
```

Build de production (manifest sans `INTERNET`) :

```bash
APP_ENV=production eas build --profile production --platform android
```

Les scénarios E2E sur appareil (ACC-04 à ACC-07) sont décrits dans
[`e2e/scenarios.md`](e2e/scenarios.md).

### Référentiel de questions

44 questions ITGC en français dans `knowledge-base/domains/`
(accès logiques, gestion des changements, opérations, continuité), validées
contre le schéma §11.1 (`knowledge-base/schema.json`) au chargement et à
l'import. La durée choisie au briefing (30/45/60/90 min) détermine la
profondeur de l'arbre via `depth_levels`.

### Prochaines phases

- **Phase 2** : LLM local (llama.cpp, sélection auto du modèle selon la RAM §5.2) — prompts et filtre de confiance déjà en place dans `ai/`
- **Phase 3** : transcription Whisper on-device, portage iOS, export PDF
- **Phase 4** : bloquée — gouvernance du référentiel non décidée ([OPEN-01])
