CREATE TABLE IF NOT EXISTS public.investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_mode TEXT NOT NULL,
  components_json JSONB NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT investigations_review_status_check
    CHECK (review_status IN ('pending', 'reviewed')),
  CONSTRAINT investigations_components_json_check
    CHECK (jsonb_typeof(components_json) = 'array')
);

ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.investigations FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.investigations TO anon, authenticated;
