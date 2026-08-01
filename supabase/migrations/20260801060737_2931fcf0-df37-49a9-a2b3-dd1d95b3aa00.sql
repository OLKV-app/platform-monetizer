-- 1. featured_listings: require a linked paid transaction
DROP POLICY IF EXISTS "Users create own featured" ON public.featured_listings;
CREATE POLICY "Featured requires paid transaction"
ON public.featured_listings FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND transaction_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = featured_listings.transaction_id
      AND t.user_id = auth.uid()
      AND t.status = 'paid'
      AND t.purpose = 'featured'
      AND t.target_id = featured_listings.listing_id
  )
);

-- 2. bump_purchases: require a linked paid transaction
DROP POLICY IF EXISTS "Users create own bumps" ON public.bump_purchases;
CREATE POLICY "Bumps require paid transaction"
ON public.bump_purchases FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND transaction_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = bump_purchases.transaction_id
      AND t.user_id = auth.uid()
      AND t.status = 'paid'
      AND t.purpose = 'bump'
      AND t.target_id = bump_purchases.listing_id
  )
);

-- 3. business_profiles: only admins may change `verified`
CREATE OR REPLACE FUNCTION public.guard_business_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.verified IS TRUE AND NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.verified := false;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.verified IS DISTINCT FROM OLD.verified
       AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change verification status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_business_verified() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_business_verified_trg ON public.business_profiles;
CREATE TRIGGER guard_business_verified_trg
BEFORE INSERT OR UPDATE ON public.business_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_business_verified();