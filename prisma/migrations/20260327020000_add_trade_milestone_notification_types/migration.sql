-- Add trade milestone notification types to the notification_type enum.
-- These are fired when a user crosses 100 / 200 / 500 / 750 / 1000 executed trades.
-- ADD VALUE cannot run inside a transaction, so each statement is standalone.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'trade_milestone_100';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'trade_milestone_200';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'trade_milestone_500';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'trade_milestone_750';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'trade_milestone_1000';
