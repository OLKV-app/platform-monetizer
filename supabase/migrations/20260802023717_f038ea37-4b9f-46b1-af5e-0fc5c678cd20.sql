-- 1. Private schema for internal helpers ------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.increment_listing_views(uuid) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.increment_listing_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.increment_listing_views(uuid) TO anon, authenticated, service_role;

-- Public invoker-only wrappers (no SECURITY DEFINER in the exposed schema)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = private, public
AS $$ SELECT private.has_role(_user_id, _role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_listing_views(_listing_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = private, public
AS $$ SELECT private.increment_listing_views(_listing_id) $$;
REVOKE ALL ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon, authenticated, service_role;

-- Existing SECURITY DEFINER functions resolve has_role through private too
ALTER FUNCTION public.apply_paid_transaction() SET search_path = private, public;
ALTER FUNCTION public.guard_business_verified() SET search_path = private, public;
ALTER FUNCTION public.expire_packages() SET search_path = private, public;

-- Helper: is the statement running from trusted server-side context?
CREATE OR REPLACE FUNCTION private.is_trusted_ctx()
RETURNS boolean LANGUAGE sql STABLE
AS $$ SELECT current_user IN ('postgres','service_role','supabase_admin','supabase_auth_admin') $$;
REVOKE ALL ON FUNCTION private.is_trusted_ctx() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_trusted_ctx() TO anon, authenticated, service_role;

-- 2. Payments cannot be self-marked as paid ----------------------------------
CREATE OR REPLACE FUNCTION public.guard_transaction_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public
AS $$
BEGIN
  IF private.is_trusted_ctx() OR private.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'New payments must start as pending';
    END IF;
    IF NEW.provider_ref IS NOT NULL THEN
      NEW.provider_ref := NULL;
    END IF;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.purpose IS DISTINCT FROM OLD.purpose
       OR NEW.target_id IS DISTINCT FROM OLD.target_id THEN
      RAISE EXCEPTION 'Only administrators can modify payment records';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_transaction_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_transaction_status_trg ON public.transactions;
CREATE TRIGGER guard_transaction_status_trg
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_transaction_status();

-- Subscriptions must be backed by a paid transaction
DROP POLICY IF EXISTS "Users create own subs" ON public.subscriptions;
CREATE POLICY "Subscriptions require paid transaction"
ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND transaction_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = subscriptions.transaction_id
      AND t.user_id = auth.uid()
      AND t.status = 'paid'
      AND t.purpose = 'subscription'
      AND t.target_id = subscriptions.plan_id
  )
);

DROP POLICY IF EXISTS "Users update own subs" ON public.subscriptions;
CREATE POLICY "Admins update subscriptions"
ON public.subscriptions FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- 3. Privileged-column guards -------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public
AS $$
BEGIN
  IF private.is_trusted_ctx() OR private.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.is_banned         := OLD.is_banned;
  NEW.ban_reason        := OLD.ban_reason;
  NEW.banned_at         := OLD.banned_at;
  NEW.verified_seller   := OLD.verified_seller;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.ad_free_until     := OLD.ad_free_until;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_privileged_columns() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_profiles_privileged_trg ON public.profiles;
CREATE TRIGGER guard_profiles_privileged_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

CREATE OR REPLACE FUNCTION public.guard_listing_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public
AS $$
BEGIN
  IF private.is_trusted_ctx() OR private.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status         := 'pending';
    NEW.featured       := false;
    NEW.featured_until := NULL;
    NEW.is_pinned      := false;
    NEW.pin_priority   := 0;
    NEW.priority       := 0;
    NEW.bumped_at      := NULL;
    NEW.view_count     := 0;
    NEW.views          := 0;
  ELSE
    NEW.status         := OLD.status;
    NEW.featured       := OLD.featured;
    NEW.featured_until := OLD.featured_until;
    NEW.is_pinned      := OLD.is_pinned;
    NEW.pin_priority   := OLD.pin_priority;
    NEW.priority       := OLD.priority;
    NEW.bumped_at      := OLD.bumped_at;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_listing_privileged_columns() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_listings_privileged_trg ON public.listings;
CREATE TRIGGER guard_listings_privileged_trg
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_privileged_columns();

CREATE OR REPLACE FUNCTION public.guard_verification_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public
AS $$
BEGIN
  IF private.is_trusted_ctx() OR private.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status             := 'pending';
    NEW.admin_notes        := NULL;
    NEW.reviewed_by        := NULL;
    NEW.reviewed_at        := NULL;
    NEW.fee_transaction_id := NULL;
  ELSE
    NEW.status             := OLD.status;
    NEW.admin_notes        := OLD.admin_notes;
    NEW.reviewed_by        := OLD.reviewed_by;
    NEW.reviewed_at        := OLD.reviewed_at;
    NEW.fee_transaction_id := OLD.fee_transaction_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_verification_privileged_columns() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_verification_privileged_trg ON public.verification_requests;
CREATE TRIGGER guard_verification_privileged_trg
BEFORE INSERT OR UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_verification_privileged_columns();

-- business_profiles.verified already guarded by guard_business_verified

-- 4. Listing image objects follow listing visibility --------------------------
CREATE OR REPLACE FUNCTION private.listing_image_is_public(_object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listing_images li
    JOIN public.listings l ON l.id = li.listing_id
    WHERE li.url LIKE '%' || _object_name || '%'
      AND l.status IN ('approved','sold')
      AND l.is_hidden = false
  );
$$;
REVOKE ALL ON FUNCTION private.listing_image_is_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.listing_image_is_public(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Listing images public read" ON storage.objects;
CREATE POLICY "Listing images public read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'listing-images'
  AND private.listing_image_is_public(name)
);

CREATE POLICY "Listing images owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'listing-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
