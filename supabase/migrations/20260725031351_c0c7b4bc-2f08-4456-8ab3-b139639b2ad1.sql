
-- 1) app_settings: whitelist public keys; restrict others to admin.
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
UPDATE public.app_settings SET is_public = true WHERE key IN ('featured_price','bump_price','verification_fee','ad_free_price','maintenance_mode','app_version','contact_support');

DROP POLICY IF EXISTS "Authenticated can read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Read public or admin settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (is_public OR public.has_role(auth.uid(), 'admin'));

-- 2) profiles_public: re-affirm security_invoker=on.
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
  WITH (security_invoker = on) AS
SELECT id, full_name, avatar_url, island, verified_seller, created_at,
       CASE WHEN hide_contact THEN NULL ELSE phone END AS phone,
       hide_contact
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 3) profiles: keep owner+admin SELECT (already in place). Re-assert for clarity.
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;

-- 4) Auto-activation trigger on paid transactions.
CREATE OR REPLACE FUNCTION public.apply_paid_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  featured_days INT;
  plan RECORD;
BEGIN
  IF NEW.status IS DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;

  IF NEW.purpose = 'featured' AND NEW.target_id IS NOT NULL THEN
    SELECT COALESCE((value->>'duration_days')::int, 7) INTO featured_days
      FROM public.app_settings WHERE key='featured_price';
    IF featured_days IS NULL THEN featured_days := 7; END IF;
    UPDATE public.listings
      SET featured = true,
          featured_until = GREATEST(COALESCE(featured_until, now()), now()) + (featured_days || ' days')::interval,
          updated_at = now()
      WHERE id = NEW.target_id AND user_id = NEW.user_id;
    INSERT INTO public.featured_listings(user_id, listing_id, transaction_id, start_date, expiry_date, priority, active)
      VALUES (NEW.user_id, NEW.target_id, NEW.id, now(), now() + (featured_days || ' days')::interval, 10, true);

  ELSIF NEW.purpose = 'bump' AND NEW.target_id IS NOT NULL THEN
    UPDATE public.listings
      SET bumped_at = now(), updated_at = now()
      WHERE id = NEW.target_id AND user_id = NEW.user_id;
    INSERT INTO public.bump_purchases(user_id, listing_id, transaction_id, bumped_at)
      VALUES (NEW.user_id, NEW.target_id, NEW.id, now());

  ELSIF NEW.purpose = 'subscription' AND NEW.target_id IS NOT NULL THEN
    SELECT * INTO plan FROM public.subscription_plans WHERE id = NEW.target_id;
    IF FOUND THEN
      INSERT INTO public.subscriptions(user_id, plan_id, transaction_id, start_date, expiry_date, status, auto_renew)
        VALUES (NEW.user_id, plan.id, NEW.id, now(),
                now() + (COALESCE(plan.duration_days,30) || ' days')::interval,
                'active', false);
      UPDATE public.profiles
        SET subscription_tier = plan.tier,
            ad_free_until = CASE WHEN plan.ad_free
              THEN GREATEST(COALESCE(ad_free_until, now()), now() + (COALESCE(plan.duration_days,30) || ' days')::interval)
              ELSE ad_free_until END,
            verified_seller = CASE WHEN plan.verified_badge THEN true ELSE verified_seller END,
            updated_at = now()
        WHERE id = NEW.user_id;
    END IF;

  ELSIF NEW.purpose = 'ad_free' THEN
    UPDATE public.profiles
      SET ad_free_until = GREATEST(COALESCE(ad_free_until, now()), now()) + interval '30 days',
          updated_at = now()
      WHERE id = NEW.user_id;

  ELSIF NEW.purpose = 'verification' AND NEW.target_id IS NOT NULL THEN
    UPDATE public.verification_requests
      SET fee_transaction_id = NEW.id, updated_at = now()
      WHERE id = NEW.target_id AND user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_paid_transaction() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_apply_paid_txn_ins ON public.transactions;
CREATE TRIGGER trg_apply_paid_txn_ins
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_paid_transaction();

DROP TRIGGER IF EXISTS trg_apply_paid_txn_upd ON public.transactions;
CREATE TRIGGER trg_apply_paid_txn_upd
  AFTER UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_paid_transaction();

-- 5) Package expiry sweeper (callable by cron or from admin).
CREATE OR REPLACE FUNCTION public.expire_packages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
    SET featured = false, featured_until = NULL, updated_at = now()
    WHERE featured = true AND featured_until IS NOT NULL AND featured_until < now();

  UPDATE public.featured_listings
    SET active = false
    WHERE active = true AND expiry_date < now();

  UPDATE public.subscriptions
    SET status = 'expired', updated_at = now()
    WHERE status = 'active' AND expiry_date < now();

  UPDATE public.profiles p
    SET subscription_tier = NULL, updated_at = now()
    WHERE p.subscription_tier IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = p.id AND s.status = 'active' AND s.expiry_date > now()
      );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.expire_packages() FROM PUBLIC, anon, authenticated;

-- 6) Best-effort pg_cron hourly schedule (safe if extension missing).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expire_packages_hourly')
      FROM cron.job WHERE jobname = 'expire_packages_hourly';
    PERFORM cron.schedule('expire_packages_hourly', '0 * * * *', $cron$SELECT public.expire_packages();$cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available: %', SQLERRM;
END $$;
