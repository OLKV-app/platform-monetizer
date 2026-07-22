
-- Fix: profiles readable by anon (phone/ban_status exposure). Restrict to authenticated.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- Listings: pin/feature/hide/view tracking
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- Categories: parenting, image, featured
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_slug text REFERENCES public.categories(slug) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Banners: type + scheduling + tracking
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS banner_type text NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

-- Banner requests submitted by sellers
CREATE TABLE IF NOT EXISTS public.banner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  link_url text,
  duration_days integer NOT NULL DEFAULT 7,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banner_requests TO authenticated;
GRANT ALL ON public.banner_requests TO service_role;
ALTER TABLE public.banner_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own requests"
  ON public.banner_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own requests"
  ON public.banner_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own pending"
  ON public.banner_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins manage all requests"
  ON public.banner_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER banner_requests_updated_at
  BEFORE UPDATE ON public.banner_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track listing views atomically
CREATE OR REPLACE FUNCTION public.increment_listing_views(_listing_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.listings SET view_count = view_count + 1 WHERE id = _listing_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon, authenticated;
