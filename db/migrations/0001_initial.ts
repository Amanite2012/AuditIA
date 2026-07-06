/**
 * Migration 0001 — schéma initial (CDC section 4.4).
 * Le contenu MUST rester strictement identique à /db/schema.sql
 * (vérifié par test dans /features/session/session.test.ts).
 */
export const MIGRATION_0001_VERSION = 1;

export const MIGRATION_0001_SQL = `
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  mission_type  TEXT NOT NULL CHECK(mission_type IN ('audit_annuel','controle_interne','revue_ciblee','autre')),
  app_name      TEXT NOT NULL,
  app_type      TEXT NOT NULL CHECK(app_type IN ('erp','middleware','batch','saas','on_premise','autre')),
  interlocutor  TEXT NOT NULL CHECK(interlocutor IN ('dba','infra','rssi','responsable_applicatif','dsi','autre')),
  domains       TEXT NOT NULL,
  duration_min  INTEGER NOT NULL CHECK(duration_min IN (30,45,60,90)),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','in_progress','completed','exported')),
  llm_mode      TEXT NOT NULL DEFAULT 'full' CHECK(llm_mode IN ('full','degraded','none')),
  hash_sha256   TEXT
);

CREATE TABLE interview_items (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text   TEXT,
  is_manual     INTEGER NOT NULL DEFAULT 0 CHECK(is_manual IN (0,1)),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','couvert','a_approfondir','non_obtenu','skipped')),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE transcripts (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  segment_start INTEGER NOT NULL,
  segment_end   INTEGER NOT NULL,
  speaker       TEXT CHECK(speaker IN ('auditor','client','unknown')),
  raw_text      TEXT NOT NULL,
  validated     INTEGER NOT NULL DEFAULT 0 CHECK(validated IN (0,1))
);

CREATE TABLE cr_assertions (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  domain           TEXT NOT NULL CHECK(domain IN ('acces','changements','operations','continuite','general')),
  assertion_text   TEXT NOT NULL,
  ai_generated     INTEGER NOT NULL DEFAULT 1 CHECK(ai_generated IN (0,1)),
  validated_by_user INTEGER NOT NULL DEFAULT 0 CHECK(validated_by_user IN (0,1)),
  user_modified_text TEXT,
  created_at       INTEGER NOT NULL,
  validated_at     INTEGER
);

CREATE TABLE consents (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id),
  type          TEXT NOT NULL CHECK(type IN ('audio_recording','data_retention')),
  granted       INTEGER NOT NULL CHECK(granted IN (0,1)),
  timestamp     INTEGER NOT NULL,
  app_version   TEXT NOT NULL
);

CREATE INDEX idx_items_session ON interview_items(session_id);
CREATE INDEX idx_items_status ON interview_items(session_id, status);
CREATE INDEX idx_assertions_session ON cr_assertions(session_id);
CREATE INDEX idx_assertions_validated ON cr_assertions(session_id, validated_by_user);
`;
