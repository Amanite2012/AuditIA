-- Schéma imposé — CDC v0.3 section 4.4.
-- Toute modification MUST passer par une migration versionnée dans /db/migrations/.

-- Sessions d'entretien
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,        -- UUID v4
  created_at    INTEGER NOT NULL,        -- Unix timestamp ms
  updated_at    INTEGER NOT NULL,
  mission_type  TEXT NOT NULL CHECK(mission_type IN ('audit_annuel','controle_interne','revue_ciblee','autre')),
  app_name      TEXT NOT NULL,
  app_type      TEXT NOT NULL CHECK(app_type IN ('erp','middleware','batch','saas','on_premise','autre')),
  interlocutor  TEXT NOT NULL CHECK(interlocutor IN ('dba','infra','rssi','responsable_applicatif','dsi','autre')),
  domains       TEXT NOT NULL,           -- JSON array: ["acces","changements",...]
  duration_min  INTEGER NOT NULL CHECK(duration_min IN (30,45,60,90)),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','in_progress','completed','exported')),
  llm_mode      TEXT NOT NULL DEFAULT 'full' CHECK(llm_mode IN ('full','degraded','none')),
  hash_sha256   TEXT                     -- Renseigné uniquement après export
);

-- Items d'entretien (questions + réponses)
CREATE TABLE interview_items (
  id            TEXT PRIMARY KEY,        -- UUID v4
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL,           -- Référence dans knowledge base
  question_text TEXT NOT NULL,
  answer_text   TEXT,
  is_manual     INTEGER NOT NULL DEFAULT 0 CHECK(is_manual IN (0,1)),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','couvert','a_approfondir','non_obtenu','skipped')),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- Transcription brute (segmentée) — utilisée en Phase 3 [ENT-04]
CREATE TABLE transcripts (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  segment_start INTEGER NOT NULL,        -- ms depuis début session
  segment_end   INTEGER NOT NULL,
  speaker       TEXT CHECK(speaker IN ('auditor','client','unknown')),
  raw_text      TEXT NOT NULL,
  validated     INTEGER NOT NULL DEFAULT 0 CHECK(validated IN (0,1))
);

-- Assertions du CR générées par LLM
-- [INVARIANT-02] appliqué : validated_by_user MUST être 1 avant tout export
CREATE TABLE cr_assertions (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  domain           TEXT NOT NULL CHECK(domain IN ('acces','changements','operations','continuite','general')),
  assertion_text   TEXT NOT NULL,
  ai_generated     INTEGER NOT NULL DEFAULT 1 CHECK(ai_generated IN (0,1)),
  validated_by_user INTEGER NOT NULL DEFAULT 0 CHECK(validated_by_user IN (0,1)),
  user_modified_text TEXT,              -- Texte modifié par l'utilisateur si différent
  created_at       INTEGER NOT NULL,
  validated_at     INTEGER             -- Timestamp de validation humaine
);

-- Consentements enregistrés (RGPD)
CREATE TABLE consents (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id),
  type          TEXT NOT NULL CHECK(type IN ('audio_recording','data_retention')),
  granted       INTEGER NOT NULL CHECK(granted IN (0,1)),
  timestamp     INTEGER NOT NULL,
  app_version   TEXT NOT NULL
);

-- Index de performance
CREATE INDEX idx_items_session ON interview_items(session_id);
CREATE INDEX idx_items_status ON interview_items(session_id, status);
CREATE INDEX idx_assertions_session ON cr_assertions(session_id);
CREATE INDEX idx_assertions_validated ON cr_assertions(session_id, validated_by_user);
