-- Safe migration: convert strategies.saved_tags from text[] to jsonb
-- Preserves all existing tag strings as { "name": "tagname" } objects.
-- Zero data loss: rows with NULL or empty arrays become '[]'::jsonb.

ALTER TABLE public.strategies ADD COLUMN saved_tags_new jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.strategies
  SET saved_tags_new = (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t)), '[]'::jsonb)
    FROM unnest(saved_tags) AS t
  );

ALTER TABLE public.strategies DROP COLUMN saved_tags;
ALTER TABLE public.strategies RENAME COLUMN saved_tags_new TO saved_tags;
