-- Lets a seller hide their phone number from the listing. When true, the
-- product page shows a "Request a call" action instead of a direct Call button.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS hide_phone BOOLEAN NOT NULL DEFAULT false;
