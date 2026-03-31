-- ─── Channel Invites: Discord-style invite links for private channels ──────────

CREATE TABLE public.channel_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID        NOT NULL REFERENCES public.feed_channels(id) ON DELETE CASCADE,
  created_by  UUID        NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  token       UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  label       VARCHAR(60),
  max_uses    INTEGER,                          -- NULL = unlimited
  use_count   INTEGER     NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,                      -- NULL = never expires
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_channel_invites_channel_id ON public.channel_invites(channel_id);
CREATE INDEX idx_channel_invites_token      ON public.channel_invites(token);

-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.channel_invites ENABLE ROW LEVEL SECURITY;

-- Channel owner can read all invites for their channel
CREATE POLICY "channel_invites_owner_select" ON public.channel_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_channels fc
      WHERE fc.id = channel_invites.channel_id
        AND fc.owner_id = (
          SELECT id FROM public.social_profiles WHERE user_id = auth.uid()
        )
    )
  );

-- Channel owner can insert invites for their channel
CREATE POLICY "channel_invites_owner_insert" ON public.channel_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.feed_channels fc
      WHERE fc.id = channel_invites.channel_id
        AND fc.owner_id = (
          SELECT id FROM public.social_profiles WHERE user_id = auth.uid()
        )
    )
  );

-- Channel owner can update (revoke) invites for their channel
CREATE POLICY "channel_invites_owner_update" ON public.channel_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_channels fc
      WHERE fc.id = channel_invites.channel_id
        AND fc.owner_id = (
          SELECT id FROM public.social_profiles WHERE user_id = auth.uid()
        )
    )
  );

-- Any authenticated user can read a specific invite by token (for redemption)
CREATE POLICY "channel_invites_redeem_select" ON public.channel_invites
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Any authenticated user can increment use_count on an active invite
CREATE POLICY "channel_invites_redeem_update" ON public.channel_invites
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);
