-- Add ai_vision_ready notification type to the notification_type enum.
-- Fired once when a user reaches 15 executed trades, notifying them
-- that the AI Vision page has enough data for fresh insights.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ai_vision_ready';
