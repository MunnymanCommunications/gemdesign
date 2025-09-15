BEGIN;

-- 1) Roles & permissions
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

DROP POLICY IF EXISTS "select_own_roles_or_admin" ON public.user_roles;
CREATE POLICY "select_own_roles_or_admin" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admin_manage_roles" ON public.user_roles;
CREATE POLICY "admin_manage_roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) Admin settings: prices & enterprise limit; restrict updates to admin
ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS price_base_cents integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_pro_cents integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_enterprise_cents integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_enterprise_documents integer NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS stripe_price_id_base text,
ADD COLUMN IF NOT EXISTS stripe_price_id_pro text,
ADD COLUMN IF NOT EXISTS stripe_price_id_enterprise text;

DROP POLICY IF EXISTS "Authenticated users can insert admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated users can update admin settings" ON public.admin_settings;

CREATE POLICY "Admins can insert admin settings"
ON public.admin_settings
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can update admin settings"
ON public.admin_settings
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- 3) Subscribers table for Stripe subscriptions
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  stripe_customer_id text,
  subscribed boolean NOT NULL DEFAULT false,
  subscription_tier text,
  subscription_end timestamptz,
  account_locked boolean NOT NULL DEFAULT false,
  lock_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR email = auth.email());

DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
CREATE POLICY "update_own_subscription" ON public.subscribers
FOR UPDATE TO authenticated
USING (true);

DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
CREATE POLICY "insert_subscription" ON public.subscribers
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "admin_select_all_subscribers" ON public.subscribers;
CREATE POLICY "admin_select_all_subscribers" ON public.subscribers
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- 4) Admin visibility for analytics, subscriptions, profiles
DROP POLICY IF EXISTS "Admins can view all analytics events" ON public.analytics_events;
CREATE POLICY "Admins can view all analytics events"
ON public.analytics_events
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can update any subscription" ON public.user_subscriptions;
CREATE POLICY "Admins can update any subscription" ON public.user_subscriptions
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- 5) Update function to support enterprise tier
CREATE OR REPLACE FUNCTION public.update_subscription_max_documents()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  base_max INTEGER;
  pro_max INTEGER;
  ent_max INTEGER;
BEGIN
  SELECT max_base_documents, max_pro_documents, max_enterprise_documents
  INTO base_max, pro_max, ent_max
  FROM public.admin_settings
  ORDER BY created_at DESC
  LIMIT 1;

  IF base_max IS NULL THEN base_max := 1; END IF;
  IF pro_max IS NULL THEN pro_max := 5; END IF;
  IF ent_max IS NULL THEN ent_max := 20; END IF;

  IF NEW.tier = 'base' THEN
    NEW.max_documents := base_max;
  ELSIF NEW.tier = 'pro' THEN
    NEW.max_documents := pro_max;
  ELSIF NEW.tier = 'enterprise' THEN
    NEW.max_documents := ent_max;
  END IF;

  RETURN NEW;
END;
$function$;

-- 6) Triggers for profiles & default subscription, and subscription max updates
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
CREATE TRIGGER on_auth_user_created_profiles
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.create_user_subscription();

DROP TRIGGER IF EXISTS set_subscription_max_documents ON public.user_subscriptions;
CREATE TRIGGER set_subscription_max_documents
BEFORE INSERT OR UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE PROCEDURE public.update_subscription_max_documents();

-- 7) Storage policies for private per-user docs and global folder
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own docs'
  ) THEN
    CREATE POLICY "Users can upload their own docs"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own docs'
  ) THEN
    CREATE POLICY "Users can view their own docs"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own docs'
  ) THEN
    CREATE POLICY "Users can update their own docs"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own docs'
  ) THEN
    CREATE POLICY "Users can delete their own docs"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can view global docs'
  ) THEN
    CREATE POLICY "Authenticated users can view global docs"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'global');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can manage global docs'
  ) THEN
    CREATE POLICY "Admins can manage global docs"
    ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'global' AND public.has_role(auth.uid(),'admin'))
    WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'global' AND public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can view any user docs'
  ) THEN
    CREATE POLICY "Admins can view any user docs"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documents' AND public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

COMMIT;