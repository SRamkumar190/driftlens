-- DriftLens InsForge schema
--
-- Apply with:
--   npx @insforge/cli db query --file integrations/rocketride-insforge/insforge/schema.sql
--
-- Write model: only the RocketRide integration writes here, using the admin
-- API key (which bypasses RLS). No INSERT/UPDATE/DELETE policies are defined,
-- so anon/authenticated callers can read but never write. The frontend is a
-- read-only consumer of investigation results.

-- ---------------------------------------------------------------------------
-- Intent profiles: what the current investigation is looking for.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS driftlens_intent_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  -- Small, bounded config only. Do not put evidence bodies in here.
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Investigations: append-only log of component results.
--
-- Deliberately append-only rather than upsert-by-component. In a
-- device-review context, an earlier classification and its evidence must stay
-- auditable after a re-run. "Latest" is a query, not an overwrite.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS driftlens_investigations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_profile_id  UUID REFERENCES driftlens_intent_profiles(id) ON DELETE SET NULL,

  component_id       TEXT NOT NULL,
  component_name     TEXT,

  -- Same four values as shared/types.ts and the pipeline's prompt node.
  status             TEXT NOT NULL CHECK (status IN (
                       'matches_design',
                       'verification_incomplete',
                       'unreviewed_drift',
                       'insufficient_evidence'
                     )),

  reviewed_value     TEXT,
  implemented_value  TEXT,
  confidence         NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  drive_evidence     TEXT,
  slack_evidence     TEXT,
  linear_evidence    TEXT,
  github_evidence    TEXT,

  conclusion         TEXT NOT NULL,
  recommended_action TEXT NOT NULL,

  -- Every new result lands as "pending" for a qualified human reviewer.
  review_status      TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN (
                       'pending',
                       'in_review',
                       'accepted',
                       'rejected'
                     )),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Serves "latest result per component", the frontend's main read.
CREATE INDEX IF NOT EXISTS driftlens_investigations_component_recent_idx
  ON driftlens_investigations (component_id, created_at DESC);

CREATE INDEX IF NOT EXISTS driftlens_investigations_review_status_idx
  ON driftlens_investigations (review_status);

-- ---------------------------------------------------------------------------
-- RLS: read-only for SDK callers; writes only via the admin API key.
-- ---------------------------------------------------------------------------
ALTER TABLE driftlens_intent_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE driftlens_investigations   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_intent_profiles" ON driftlens_intent_profiles;
CREATE POLICY "read_intent_profiles" ON driftlens_intent_profiles
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "read_investigations" ON driftlens_investigations;
CREATE POLICY "read_investigations" ON driftlens_investigations
  FOR SELECT TO anon, authenticated
  USING (TRUE);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON driftlens_intent_profiles TO anon, authenticated;
GRANT SELECT ON driftlens_investigations  TO anon, authenticated;

-- Keep updated_at honest.
DROP TRIGGER IF EXISTS driftlens_intent_profiles_updated_at ON driftlens_intent_profiles;
CREATE TRIGGER driftlens_intent_profiles_updated_at
  BEFORE UPDATE ON driftlens_intent_profiles
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

DROP TRIGGER IF EXISTS driftlens_investigations_updated_at ON driftlens_investigations;
CREATE TRIGGER driftlens_investigations_updated_at
  BEFORE UPDATE ON driftlens_investigations
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Default intent profile so the first pipeline run has something to attach to.
INSERT INTO driftlens_intent_profiles (name, description, config)
VALUES (
  'default',
  'Cross-system drift review across Google Drive, Slack, Linear, and GitHub.',
  '{"sources": ["drive", "slack", "linear", "github"]}'::jsonb
)
ON CONFLICT (name) DO NOTHING;
