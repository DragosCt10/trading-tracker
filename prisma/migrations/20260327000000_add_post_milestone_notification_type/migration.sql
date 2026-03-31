-- Add post_milestone value to notification_type enum
-- Used to track community contribution milestones (100 / 200 / 300 posts+comments).
-- Reaching 300 earns a 15% PRO discount notification.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'post_milestone';
