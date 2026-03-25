-- feed_reports INSERT was failing with 42501: RLS WITH CHECK used a scalar
-- subquery on social_profiles; depending on evaluation/visibility, that can yield
-- NULL and reject valid inserts. Use SECURITY DEFINER helper (same pattern as
-- other Supabase policies) so ownership is checked without RLS blocking the lookup.

CREATE OR REPLACE FUNCTION public.feed_reports_reporter_is_authenticated_user(p_reporter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_profiles sp
    WHERE sp.id = p_reporter_id AND sp.user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.feed_reports_reporter_is_authenticated_user(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.feed_reports_reporter_is_authenticated_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feed_reports_reporter_is_authenticated_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_reports_reporter_is_authenticated_user(uuid) TO service_role;

DROP POLICY IF EXISTS "reports_insert"     ON public.feed_reports;
DROP POLICY IF EXISTS "reports_select_own"  ON public.feed_reports;

CREATE POLICY "reports_insert" ON public.feed_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.feed_reports_reporter_is_authenticated_user(reporter_id));

CREATE POLICY "reports_select_own" ON public.feed_reports
  FOR SELECT TO authenticated
  USING (public.feed_reports_reporter_is_authenticated_user(reporter_id));
