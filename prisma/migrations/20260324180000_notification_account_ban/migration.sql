-- In-app notification when a moderator bans a user from the social feed.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'account_ban';
