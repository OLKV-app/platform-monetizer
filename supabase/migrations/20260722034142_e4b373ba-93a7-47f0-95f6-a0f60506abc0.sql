
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
  SELECT id, full_name, avatar_url, island, verified_seller, created_at
  FROM public.profiles
  WHERE COALESCE(is_banned, false) = false;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
