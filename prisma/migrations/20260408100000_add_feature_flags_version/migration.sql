-- Add optimistic locking version column to user_settings
-- Used by updateFeatureFlags to prevent concurrent JSONB write conflicts (last-writer-wins)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
