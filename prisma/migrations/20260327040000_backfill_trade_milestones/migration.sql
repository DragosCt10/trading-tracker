-- Backfill trade milestones for existing users.
--
-- For every user who already has 100+ executed trades but no trade_badge yet:
--   1. Counts total executed trades across live_trades, demo_trades, backtesting_trades
--   2. Sets social_profiles.trade_badge to the highest earned milestone
--   3. Upserts user_settings.feature_flags with badge info + available_discounts
--   4. Inserts missed milestone notifications (idempotent — skips if already present)
--
-- Safe to re-run: outer WHERE filters to trade_badge IS NULL,
-- notifications use existence checks before inserting.

DO $$
DECLARE
  v_rec            RECORD;
  v_total          INTEGER;
  v_badge          TEXT;
  v_discounts      JSONB;
  v_existing_flags JSONB;
  v_notif_count    INTEGER;
BEGIN
  FOR v_rec IN
    SELECT sp.id AS profile_id, sp.user_id
    FROM   public.social_profiles sp
    WHERE  sp.trade_badge IS NULL
      AND  sp.user_id IS NOT NULL
  LOOP

    -- Count executed trades across all 3 mode tables
    SELECT
        COALESCE((SELECT COUNT(*) FROM public.live_trades        WHERE user_id = v_rec.user_id AND executed IS NOT FALSE), 0)
      + COALESCE((SELECT COUNT(*) FROM public.demo_trades        WHERE user_id = v_rec.user_id AND executed IS NOT FALSE), 0)
      + COALESCE((SELECT COUNT(*) FROM public.backtesting_trades WHERE user_id = v_rec.user_id AND executed IS NOT FALSE), 0)
    INTO v_total;

    CONTINUE WHEN v_total < 100;

    -- Determine highest earned badge
    v_badge := CASE
      WHEN v_total >= 1000 THEN 'alpha_trader'
      WHEN v_total >= 750  THEN 'master_trader'
      WHEN v_total >= 500  THEN 'expert_trader'
      WHEN v_total >= 200  THEN 'skilled_trader'
      ELSE                      'rookie_trader'
    END;

    -- 1. Set trade_badge on social_profiles
    UPDATE public.social_profiles
    SET    trade_badge = v_badge
    WHERE  id = v_rec.profile_id;

    -- 2. Build available_discounts array (all unused — user never had the feature)
    v_discounts := '[]'::JSONB;
    IF v_total >= 100  THEN v_discounts := v_discounts || '[{"milestoneId":"rookie_trader", "discountPct":5,  "used":false}]'::JSONB; END IF;
    IF v_total >= 200  THEN v_discounts := v_discounts || '[{"milestoneId":"skilled_trader","discountPct":10, "used":false}]'::JSONB; END IF;
    IF v_total >= 500  THEN v_discounts := v_discounts || '[{"milestoneId":"expert_trader", "discountPct":15, "used":false}]'::JSONB; END IF;
    IF v_total >= 750  THEN v_discounts := v_discounts || '[{"milestoneId":"master_trader", "discountPct":15, "used":false}]'::JSONB; END IF;
    IF v_total >= 1000 THEN v_discounts := v_discounts || '[{"milestoneId":"alpha_trader",  "discountPct":20, "used":false}]'::JSONB; END IF;

    -- 3. Merge with existing feature_flags (preserves any other keys already there)
    SELECT COALESCE(feature_flags, '{}'::JSONB)
    INTO   v_existing_flags
    FROM   public.user_settings
    WHERE  user_id = v_rec.user_id;

    IF v_existing_flags IS NULL THEN
      v_existing_flags := '{}'::JSONB;
    END IF;

    INSERT INTO public.user_settings (user_id, feature_flags)
    VALUES (
      v_rec.user_id,
      v_existing_flags || jsonb_build_object(
        'trade_badge',        jsonb_build_object('id', v_badge, 'totalTrades', v_total, 'achievedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
        'available_discounts', v_discounts
      )
    )
    ON CONFLICT (user_id) DO UPDATE
      SET feature_flags = user_settings.feature_flags || jsonb_build_object(
        'trade_badge',        jsonb_build_object('id', v_badge, 'totalTrades', v_total, 'achievedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
        'available_discounts', v_discounts
      );

    -- 4. Insert milestone notifications (skip if already present)
    IF v_total >= 100 THEN
      SELECT COUNT(*) INTO v_notif_count FROM public.feed_notifications WHERE recipient_id = v_rec.profile_id AND type = 'trade_milestone_100';
      IF v_notif_count = 0 THEN INSERT INTO public.feed_notifications (recipient_id, actor_id, type, post_id, comment_id) VALUES (v_rec.profile_id, v_rec.profile_id, 'trade_milestone_100', NULL, NULL); END IF;
    END IF;
    IF v_total >= 200 THEN
      SELECT COUNT(*) INTO v_notif_count FROM public.feed_notifications WHERE recipient_id = v_rec.profile_id AND type = 'trade_milestone_200';
      IF v_notif_count = 0 THEN INSERT INTO public.feed_notifications (recipient_id, actor_id, type, post_id, comment_id) VALUES (v_rec.profile_id, v_rec.profile_id, 'trade_milestone_200', NULL, NULL); END IF;
    END IF;
    IF v_total >= 500 THEN
      SELECT COUNT(*) INTO v_notif_count FROM public.feed_notifications WHERE recipient_id = v_rec.profile_id AND type = 'trade_milestone_500';
      IF v_notif_count = 0 THEN INSERT INTO public.feed_notifications (recipient_id, actor_id, type, post_id, comment_id) VALUES (v_rec.profile_id, v_rec.profile_id, 'trade_milestone_500', NULL, NULL); END IF;
    END IF;
    IF v_total >= 750 THEN
      SELECT COUNT(*) INTO v_notif_count FROM public.feed_notifications WHERE recipient_id = v_rec.profile_id AND type = 'trade_milestone_750';
      IF v_notif_count = 0 THEN INSERT INTO public.feed_notifications (recipient_id, actor_id, type, post_id, comment_id) VALUES (v_rec.profile_id, v_rec.profile_id, 'trade_milestone_750', NULL, NULL); END IF;
    END IF;
    IF v_total >= 1000 THEN
      SELECT COUNT(*) INTO v_notif_count FROM public.feed_notifications WHERE recipient_id = v_rec.profile_id AND type = 'trade_milestone_1000';
      IF v_notif_count = 0 THEN INSERT INTO public.feed_notifications (recipient_id, actor_id, type, post_id, comment_id) VALUES (v_rec.profile_id, v_rec.profile_id, 'trade_milestone_1000', NULL, NULL); END IF;
    END IF;

  END LOOP;
END $$;
