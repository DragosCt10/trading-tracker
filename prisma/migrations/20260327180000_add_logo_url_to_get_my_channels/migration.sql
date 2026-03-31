-- Add logo_url column to feed_channels table.
ALTER TABLE public.feed_channels
  ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Update get_my_channels RPC to include logo_url column.
-- The function had an explicit column list; adding logo_url to feed_channels
-- requires this function to be updated or it silently drops the new field.
-- DROP first because CREATE OR REPLACE cannot change the RETURNS TABLE signature.
DROP FUNCTION IF EXISTS public.get_my_channels(uuid);
CREATE OR REPLACE FUNCTION public.get_my_channels(p_profile_id uuid)
RETURNS TABLE (
  id           uuid,
  owner_id     uuid,
  name         text,
  slug         text,
  description  text,
  logo_url     text,
  is_public    boolean,
  created_at   timestamptz,
  updated_at   timestamptz,
  member_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    c.id,
    c.owner_id,
    c.name,
    c.slug,
    c.description,
    c.logo_url,
    c.is_public,
    c.created_at,
    c.updated_at,
    COUNT(m.user_id)::bigint AS member_count
  FROM public.feed_channels c
  LEFT JOIN public.channel_members m ON m.channel_id = c.id
  WHERE c.owner_id = p_profile_id
     OR c.id IN (
       SELECT cm.channel_id
       FROM public.channel_members cm
       WHERE cm.user_id = p_profile_id
     )
  GROUP BY c.id
  ORDER BY c.updated_at DESC;
$$;
