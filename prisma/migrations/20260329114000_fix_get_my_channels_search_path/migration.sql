-- Fix security warning: set immutable search_path on get_my_channels.
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
SET search_path = public
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
