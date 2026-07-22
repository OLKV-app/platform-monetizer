-- Fix: is_hidden was added as a moderation column but was never enforced by
-- Row Level Security. Public visibility relied entirely on ad-hoc client-side
-- filters (some list queries added `.eq('is_hidden', false)`, others didn't),
-- so an admin "Hide" action did not reliably hide a listing (e.g. direct
-- product links, search, and category pages could still show it).
--
-- Enforce it centrally in RLS so hidden listings are never publicly
-- readable regardless of which query path is used.

DROP POLICY IF EXISTS "listings public read approved" ON public.listings;
CREATE POLICY "listings public read approved" ON public.listings
  FOR SELECT USING (
    status IN ('approved','sold')
    AND is_hidden = false
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = listings.user_id AND p.is_banned)
  );

-- listing_images inherits visibility from the parent listing; keep it in sync
-- with the same is_hidden rule (owners/admins can still see images of their
-- own or any listing respectively).
DROP POLICY IF EXISTS "listing_images public read" ON public.listing_images;
CREATE POLICY "listing_images public read" ON public.listing_images FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_id
      AND (
        (l.status IN ('approved','sold') AND l.is_hidden = false)
        OR l.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);
