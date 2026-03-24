-- ─── Secure channel invite redemption ────────────────────────────────────────
--
-- Problems fixed:
--   1. RLS policy "channel_invites_redeem_update" was over-permissive: any
--      authenticated user could UPDATE any active invite row via the REST API,
--      allowing them to revoke or manipulate invites they don't own.
--   2. The app-level redemption was non-atomic: read-then-write on use_count
--      with no transaction, meaning concurrent requests could exceed max_uses
--      by 1, and a failed joinChannel left use_count incremented with no join.
--   3. Redemption happened inside a Server Component render (on GET), so bots
--      and link-preview crawlers would consume invite uses / join the user.
--
-- Solution: replace the bad RLS UPDATE policy with a SECURITY DEFINER function
-- that runs as the DB owner, uses SELECT FOR UPDATE to lock the row, and wraps
-- validate → increment → join in a single atomic transaction.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the over-permissive policy that allowed any auth'd user to UPDATE any
-- active invite row (use_count manipulation, revoking others' invites, etc.)
DROP POLICY IF EXISTS "channel_invites_redeem_update" ON public.channel_invites;

-- ─── Atomic redemption function ───────────────────────────────────────────────
-- Returns a single row: (channel_slug, already_member, error_code)
--   error_code is NULL on success; one of INVALID/EXPIRED/MAXED/NOT_FOUND on failure.
--   channel_slug and already_member are NULL when error_code is not NULL.
--
-- SECURITY DEFINER: runs as the function owner (DB admin), bypassing RLS.
-- The caller is still auth'd — we look up their profile via auth.uid() inside.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.redeem_channel_invite(p_token UUID)
RETURNS TABLE (
  channel_slug   TEXT,
  already_member BOOLEAN,
  error_code     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id   UUID;
  v_invite_id    UUID;
  v_channel_id   UUID;
  v_max_uses     INTEGER;
  v_use_count    INTEGER;
  v_expires_at   TIMESTAMPTZ;
  v_is_active    BOOLEAN;
  v_slug         TEXT;
  v_is_member    BOOLEAN;
BEGIN
  -- 1. Resolve caller → social_profiles.id
  SELECT sp.id
    INTO v_profile_id
    FROM public.social_profiles sp
   WHERE sp.user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::BOOLEAN, 'INVALID'::TEXT;
    RETURN;
  END IF;

  -- 2. Lock invite row for update to prevent concurrent over-redemption
  SELECT ci.id, ci.channel_id, ci.max_uses, ci.use_count, ci.expires_at, ci.is_active
    INTO v_invite_id, v_channel_id, v_max_uses, v_use_count, v_expires_at, v_is_active
    FROM public.channel_invites ci
   WHERE ci.token = p_token
     FOR UPDATE;

  -- 3. Validate invite existence and active state
  IF v_invite_id IS NULL OR NOT v_is_active THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::BOOLEAN, 'INVALID'::TEXT;
    RETURN;
  END IF;

  -- 4. Check expiry
  IF v_expires_at IS NOT NULL AND v_expires_at <= NOW() THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::BOOLEAN, 'EXPIRED'::TEXT;
    RETURN;
  END IF;

  -- 5. Check max uses
  IF v_max_uses IS NOT NULL AND v_use_count >= v_max_uses THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::BOOLEAN, 'MAXED'::TEXT;
    RETURN;
  END IF;

  -- 6. Check if caller is already a member
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members cm
     WHERE cm.channel_id = v_channel_id
       AND cm.user_id    = v_profile_id
  ) INTO v_is_member;

  -- 7. Fetch channel slug (always available — running as SECURITY DEFINER)
  SELECT fc.slug INTO v_slug
    FROM public.feed_channels fc
   WHERE fc.id = v_channel_id;

  IF v_slug IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::BOOLEAN, 'INVALID'::TEXT;
    RETURN;
  END IF;

  IF v_is_member THEN
    -- Already a member — no state changes needed
    RETURN QUERY SELECT v_slug, TRUE, NULL::TEXT;
    RETURN;
  END IF;

  -- 8. Increment use_count (we hold the row lock so this is safe)
  UPDATE public.channel_invites
     SET use_count = v_use_count + 1
   WHERE id = v_invite_id;

  -- 9. Upsert membership (idempotent: no-op on duplicate)
  INSERT INTO public.channel_members (channel_id, user_id, role)
  VALUES (v_channel_id, v_profile_id, 'member')
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  RETURN QUERY SELECT v_slug, FALSE, NULL::TEXT;
END;
$$;

-- Revoke public execute — only the service role / app can call it
REVOKE ALL ON FUNCTION public.redeem_channel_invite(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.redeem_channel_invite(UUID) TO authenticated;
