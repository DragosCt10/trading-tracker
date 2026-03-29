-- Add trade_milestone_5000 to notification_type enum for Elite Trader (5000+ trades)
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'trade_milestone_5000';
