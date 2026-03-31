-- Track users removed by the channel owner on *public* channels so they stay read-only
-- (no self-join, no post/like/comment) until the owner adds them back.
CREATE TABLE public.channel_public_removed_members (
  channel_id UUID NOT NULL REFERENCES public.feed_channels(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  removed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_channel_public_removed_members_user ON public.channel_public_removed_members(user_id);

ALTER TABLE public.channel_public_removed_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_public_removed_members_select_own"
  ON public.channel_public_removed_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.social_profiles sp
      WHERE sp.id = user_id AND sp.user_id = auth.uid()
    )
  );
