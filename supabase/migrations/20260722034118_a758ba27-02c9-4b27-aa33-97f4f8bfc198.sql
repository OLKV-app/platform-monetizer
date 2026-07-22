
-- ============ PROFILES SECURITY FIX ============
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
DROP POLICY IF EXISTS "profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

REVOKE SELECT ON public.profiles FROM anon;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Authenticated users can view profiles'
  ) THEN
    CREATE POLICY "Authenticated users can view profiles"
      ON public.profiles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ============ PROFILE / LISTING EXTENSIONS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_seller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS ad_free_until timestamptz,
  ADD COLUMN IF NOT EXISTS firebase_uid text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles(firebase_uid) WHERE firebase_uid IS NOT NULL;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS bumped_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

-- Public safe view (no phone, no ban details)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
  SELECT id, full_name, avatar_url, island, verified_seller, created_at
  FROM public.profiles
  WHERE COALESCE(is_banned, false) = false;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ============ APP SETTINGS ============
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage settings" ON public.app_settings;
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SUBSCRIPTION PLANS ============
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  duration_days integer NOT NULL DEFAULT 30,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_listings integer,
  ad_free boolean NOT NULL DEFAULT false,
  verified_badge boolean NOT NULL DEFAULT false,
  priority_support boolean NOT NULL DEFAULT false,
  search_priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plans viewable by all" ON public.subscription_plans;
CREATE POLICY "Plans viewable by all" ON public.subscription_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage plans" ON public.subscription_plans;
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  provider text NOT NULL DEFAULT 'manual',
  provider_ref text,
  status text NOT NULL DEFAULT 'pending',
  purpose text NOT NULL,
  target_id uuid,
  invoice_number text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users create own transactions" ON public.transactions;
CREATE POLICY "Users create own transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins update transactions" ON public.transactions;
CREATE POLICY "Admins update transactions" ON public.transactions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SUBSCRIPTIONS ============
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  transaction_id uuid REFERENCES public.transactions(id),
  start_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  auto_renew boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, expiry_date DESC);
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own subs" ON public.subscriptions;
CREATE POLICY "Users view own subs" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users create own subs" ON public.subscriptions;
CREATE POLICY "Users create own subs" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own subs" ON public.subscriptions;
CREATE POLICY "Users update own subs" ON public.subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FEATURED LISTINGS ============
CREATE TABLE IF NOT EXISTS public.featured_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id),
  start_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_featured_listing ON public.featured_listings(listing_id, expiry_date DESC);
GRANT SELECT ON public.featured_listings TO anon, authenticated;
GRANT INSERT ON public.featured_listings TO authenticated;
GRANT UPDATE, DELETE ON public.featured_listings TO authenticated;
GRANT ALL ON public.featured_listings TO service_role;
ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Featured viewable" ON public.featured_listings;
CREATE POLICY "Featured viewable" ON public.featured_listings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create own featured" ON public.featured_listings;
CREATE POLICY "Users create own featured" ON public.featured_listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage featured" ON public.featured_listings;
CREATE POLICY "Admins manage featured" ON public.featured_listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ BUMP PURCHASES ============
CREATE TABLE IF NOT EXISTS public.bump_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id),
  bumped_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bump_user ON public.bump_purchases(user_id, bumped_at DESC);
GRANT SELECT, INSERT ON public.bump_purchases TO authenticated;
GRANT ALL ON public.bump_purchases TO service_role;
ALTER TABLE public.bump_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own bumps" ON public.bump_purchases;
CREATE POLICY "Users view own bumps" ON public.bump_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users create own bumps" ON public.bump_purchases;
CREATE POLICY "Users create own bumps" ON public.bump_purchases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ VERIFICATION REQUESTS ============
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  id_document_url text,
  address_document_url text,
  additional_docs jsonb DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  fee_transaction_id uuid REFERENCES public.transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own verification" ON public.verification_requests;
CREATE POLICY "Users view own verification" ON public.verification_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users submit verification" ON public.verification_requests;
CREATE POLICY "Users submit verification" ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage verification" ON public.verification_requests;
CREATE POLICY "Admins manage verification" ON public.verification_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_verification_updated_at ON public.verification_requests;
CREATE TRIGGER update_verification_updated_at
  BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ BUSINESS PROFILES ============
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  logo_url text,
  cover_url text,
  description text,
  contact_phone text,
  contact_email text,
  website text,
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_profiles TO authenticated;
GRANT ALL ON public.business_profiles TO service_role;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business profiles public" ON public.business_profiles;
CREATE POLICY "Business profiles public" ON public.business_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own business" ON public.business_profiles;
CREATE POLICY "Users manage own business" ON public.business_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ADVERTISEMENTS ============
CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link text,
  location text NOT NULL DEFAULT 'home',
  category_id uuid REFERENCES public.categories(id),
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'active',
  views bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ads viewable" ON public.advertisements;
CREATE POLICY "Ads viewable" ON public.advertisements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage ads" ON public.advertisements;
CREATE POLICY "Admins manage ads" ON public.advertisements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_advertisements_updated_at ON public.advertisements;
CREATE TRIGGER update_advertisements_updated_at
  BEFORE UPDATE ON public.advertisements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUDIT LOGS ============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view audit" ON public.audit_logs;
CREATE POLICY "Admins view audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins insert audit" ON public.audit_logs;
CREATE POLICY "Admins insert audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND auth.uid() = admin_id);

-- ============ LEGAL PAGES ============
CREATE TABLE IF NOT EXISTS public.legal_pages (
  slug text PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
GRANT SELECT ON public.legal_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.legal_pages TO authenticated;
GRANT ALL ON public.legal_pages TO service_role;
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Legal pages public" ON public.legal_pages;
CREATE POLICY "Legal pages public" ON public.legal_pages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage legal" ON public.legal_pages;
CREATE POLICY "Admins manage legal" ON public.legal_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SEEDS ============
INSERT INTO public.subscription_plans (code, name, tier, price, duration_days, benefits, max_listings, ad_free, verified_badge, priority_support, search_priority, sort_order)
VALUES
  ('free','Free','free', 0, 3650, '["Up to 5 active listings","Basic support","Ads shown"]'::jsonb, 5, false, false, false, 0, 0),
  ('ad_free','Ad-Free','ad_free', 99, 30, '["All Free features","No advertisements","Cleaner experience"]'::jsonb, 5, true, false, false, 0, 1),
  ('premium','Premium','premium', 299, 30, '["Unlimited listings","Ad-free","Priority support","Better visibility","Discounts on promotions"]'::jsonb, NULL, true, false, true, 5, 2),
  ('business','Business','business', 999, 30, '["Unlimited listings","Verified business badge","Business profile page","Business analytics","Highest search priority","Ad-free"]'::jsonb, NULL, true, true, true, 10, 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.app_settings (key, value, description) VALUES
  ('featured_price', '{"price":49,"currency":"INR","duration_days":7}'::jsonb, 'Featured listing pricing'),
  ('bump_price', '{"price":19,"currency":"INR","cooldown_hours":24,"daily_limit":3}'::jsonb, 'Bump listing pricing'),
  ('verification_fee', '{"price":0,"currency":"INR"}'::jsonb, 'Seller verification fee'),
  ('admob', '{"enabled":true,"banner_ad_unit":"","interstitial_ad_unit":"","native_ad_unit":"","use_test_ids":true,"locations":{"home":true,"search":true,"product":true}}'::jsonb, 'AdMob configuration'),
  ('maintenance_mode', '{"enabled":false,"message":""}'::jsonb, 'Maintenance mode'),
  ('support_contact', '{"email":"support@olkv.app","phone":""}'::jsonb, 'Support contact'),
  ('app_version', '"1.0.0"'::jsonb, 'App version')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.legal_pages (slug, title, content) VALUES
  ('privacy','Privacy Policy',
'# Privacy Policy

_Last updated: July 2026_

This Privacy Policy describes how OLKV collects, uses, and protects your information.

## Data Collection
We collect information you provide (name, phone, email, listing details) and technical data (device, IP, usage).

## Authentication
Authentication is provided via Firebase Authentication. Only your identifier and email are shared with our backend.

## Storage
Images and documents are stored in Firebase Storage. Only their download URLs are stored in our database.

## Database
Application data is stored in Supabase (PostgreSQL) with Row Level Security enforced.

## Cookies & Analytics
We use session cookies for authentication and privacy-respecting analytics.

## Advertising
Free-tier users may see ads via Google AdMob. Premium, Business, and Ad-Free users see no ads.

## Third-Party Services
Firebase, Supabase, and payment gateways (Razorpay / Stripe / Google Play Billing).

## Data Security
All traffic is encrypted (HTTPS). Passwords are handled by Firebase and never stored by us.

## User Rights
You may request access, correction, or deletion of your data by contacting support.

## Account Deletion
Delete your account from the profile screen or by emailing support.

## Contact
support@olkv.app'),
  ('terms','Terms & Conditions',
'# Terms & Conditions

_Last updated: July 2026_

## User Responsibilities
Provide accurate information, keep credentials safe, comply with local laws.

## Seller Responsibilities
List only items you own. Describe items accurately. Honor commitments.

## Buyer Responsibilities
Inspect items before purchase. Communicate respectfully.

## Prohibited Content
Illegal items, weapons, drugs, hateful content, adult content, counterfeit goods, wildlife.

## Listing Rules
No duplicate reposts of other users'' listings. No misleading titles.

## Account Suspension
Repeated reports or policy violations result in suspension or ban at admin discretion.

## Payment Terms
Purchases (subscriptions, featured, bump, verification) are non-refundable except where required by law.

## Refund Policy
Contact support within 7 days for refund review.

## Intellectual Property
You retain ownership of content you post; you grant OLKV a license to display it.

## Limitation of Liability
OLKV is a marketplace platform. Transactions occur directly between users.

## Privacy
See the Privacy Policy.

## Governing Law
Governed by the laws of India.

## Contact
support@olkv.app')
ON CONFLICT (slug) DO NOTHING;
