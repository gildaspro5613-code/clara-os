-- ============================================
-- CLARA OS
-- Persistence V1
-- Provider-neutral PostgreSQL schema
-- ============================================

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  context TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'blocked', 'completed', 'cancelled')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  next_action TEXT,
  last_action TEXT,
  result TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS missions_status_idx ON missions (status);
CREATE INDEX IF NOT EXISTS missions_updated_at_idx ON missions (updated_at DESC);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('SYSTEM', 'COGNITIVE', 'ACTION', 'LEARNING')),
  created_at TIMESTAMPTZ NOT NULL,
  summary TEXT NOT NULL,
  details TEXT,
  recommendation JSONB
);

CREATE INDEX IF NOT EXISTS journal_entries_created_at_idx
  ON journal_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS journal_entries_type_created_at_idx
  ON journal_entries (type, created_at DESC);
