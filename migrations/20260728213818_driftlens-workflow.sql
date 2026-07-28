ALTER TABLE public.investigations
  ADD COLUMN IF NOT EXISTS response_source TEXT NOT NULL DEFAULT 'rocketride',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'investigations_response_source_check'
      AND conrelid = 'public.investigations'::regclass
  ) THEN
    ALTER TABLE public.investigations
      ADD CONSTRAINT investigations_response_source_check
      CHECK (response_source IN ('rocketride', 'demo_fallback'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS investigations_created_at_idx
  ON public.investigations (created_at DESC);

CREATE INDEX IF NOT EXISTS investigations_review_status_idx
  ON public.investigations (review_status, created_at DESC);

CREATE INDEX IF NOT EXISTS investigations_reviewed_by_idx
  ON public.investigations (reviewed_by);

DROP TRIGGER IF EXISTS investigations_updated_at ON public.investigations;
CREATE TRIGGER investigations_updated_at
  BEFORE UPDATE ON public.investigations
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS investigations_authenticated_select
  ON public.investigations;

CREATE POLICY investigations_authenticated_select
  ON public.investigations
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

REVOKE ALL ON TABLE public.investigations FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.investigations TO authenticated;

CREATE OR REPLACE FUNCTION public.review_investigation(
  p_investigation_id UUID
)
RETURNS TABLE (
  id UUID,
  review_status TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  reviewer UUID := auth.uid();
BEGIN
  IF reviewer IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  UPDATE public.investigations AS investigation
  SET review_status = 'reviewed',
      reviewed_by = reviewer,
      reviewed_at = NOW()
  WHERE investigation.id = p_investigation_id
  RETURNING
    investigation.id,
    investigation.review_status,
    investigation.reviewed_by,
    investigation.reviewed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.review_investigation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_investigation(UUID) TO authenticated;

CREATE TABLE IF NOT EXISTS public.investigation_evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL
    REFERENCES public.investigations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'investigation-evidence',
  storage_key TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT investigation_evidence_bucket_check
    CHECK (storage_bucket = 'investigation-evidence'),
  UNIQUE (storage_bucket, storage_key)
);

CREATE INDEX IF NOT EXISTS investigation_evidence_investigation_idx
  ON public.investigation_evidence_files (investigation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS investigation_evidence_owner_idx
  ON public.investigation_evidence_files (owner_id);

ALTER TABLE public.investigation_evidence_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY investigation_evidence_authenticated_select
  ON public.investigation_evidence_files
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY investigation_evidence_owner_insert
  ON public.investigation_evidence_files
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY investigation_evidence_owner_delete
  ON public.investigation_evidence_files
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.investigation_evidence_files
  FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.investigation_evidence_files TO authenticated;

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES (
  'investigation:%',
  'DriftLens investigation completion and review updates',
  true
)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

ALTER TABLE realtime.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS driftlens_investigation_channels_select
  ON realtime.channels;

CREATE POLICY driftlens_investigation_channels_select
  ON realtime.channels
  FOR SELECT
  TO authenticated
  USING (
    pattern = 'investigation:%'
    AND realtime.channel_name() LIKE 'investigation:%'
  );

CREATE OR REPLACE FUNCTION public.publish_investigation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM realtime.publish(
      'investigation:' || NEW.id::TEXT,
      'investigation_saved',
      jsonb_build_object(
        'id', NEW.id,
        'review_status', NEW.review_status,
        'created_at', NEW.created_at
      )
    );
  ELSIF OLD.review_status IS DISTINCT FROM NEW.review_status THEN
    PERFORM realtime.publish(
      'investigation:' || NEW.id::TEXT,
      'review_status_changed',
      jsonb_build_object(
        'id', NEW.id,
        'review_status', NEW.review_status,
        'reviewed_by', NEW.reviewed_by,
        'reviewed_at', NEW.reviewed_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS investigations_publish_change
  ON public.investigations;

CREATE TRIGGER investigations_publish_change
AFTER INSERT OR UPDATE OF review_status
ON public.investigations
FOR EACH ROW
EXECUTE FUNCTION public.publish_investigation_change();

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS driftlens_evidence_select ON storage.objects;
DROP POLICY IF EXISTS driftlens_evidence_insert ON storage.objects;
DROP POLICY IF EXISTS driftlens_evidence_update ON storage.objects;
DROP POLICY IF EXISTS driftlens_evidence_delete ON storage.objects;

CREATE POLICY driftlens_evidence_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket = 'investigation-evidence'
    AND (storage.foldername(key))[1] =
      (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY driftlens_evidence_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket = 'investigation-evidence'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
    AND (storage.foldername(key))[1] =
      (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY driftlens_evidence_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket = 'investigation-evidence'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    bucket = 'investigation-evidence'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
    AND (storage.foldername(key))[1] =
      (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY driftlens_evidence_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket = 'investigation-evidence'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
  );

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON storage.objects TO authenticated;
