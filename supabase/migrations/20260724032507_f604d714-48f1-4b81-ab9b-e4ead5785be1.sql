
-- Restrict EXECUTE on SECURITY DEFINER functions to only the roles that need them.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_favourite() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_listing_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;

-- has_role is called from RLS policies; keep it callable by signed-in users only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- increment_listing_views is invoked via RPC when anyone views a listing.
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon, authenticated;
