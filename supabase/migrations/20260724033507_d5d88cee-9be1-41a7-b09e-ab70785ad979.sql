
-- ============================================================
-- 1) profiles_public view: recreate with security_invoker=on
-- ============================================================
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  full_name,
  avatar_url,
  island,
  verified_seller,
  created_at,
  CASE WHEN hide_contact THEN NULL ELSE phone END AS phone,
  hide_contact
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ============================================================
-- 2) profiles: restrict SELECT to owner + admins
-- ============================================================
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles owner can read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Profiles admin can read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 3) business_profiles: remove public read, keep owner+admin
-- ============================================================
DROP POLICY IF EXISTS "Business profiles public" ON public.business_profiles;

CREATE POLICY "Business profiles owner/admin read"
  ON public.business_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 4) app_settings: restrict SELECT to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;

CREATE POLICY "Authenticated can read settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 5) storage.objects RLS for listing-images, avatars, banners
--    Path convention: <user_id>/<filename>
-- ============================================================

-- Public read for listing images (buyers browsing listings)
CREATE POLICY "Listing images public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'listing-images');

-- Public read for banners (shown on home page)
CREATE POLICY "Banners public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'banners');

-- Avatars readable by any signed-in user
CREATE POLICY "Avatars authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- Owner-scoped write access (INSERT/UPDATE/DELETE) — filename first segment must equal auth.uid()
CREATE POLICY "User can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('listing-images','avatars','banners')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "User can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('listing-images','avatars','banners')
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id IN ('listing-images','avatars','banners')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "User can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('listing-images','avatars','banners')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can manage any file in these buckets (moderation)
CREATE POLICY "Admin manage marketplace files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id IN ('listing-images','avatars','banners')
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    bucket_id IN ('listing-images','avatars','banners')
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );
