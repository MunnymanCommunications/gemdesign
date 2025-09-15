-- Recreate security definer functions with explicit search_path to address linter warnings

-- 1) Role check helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 2) Generic updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3) Create profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- 4) Create a base subscription for new users and seed max_documents from admin_settings
CREATE OR REPLACE FUNCTION public.create_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  base_max integer;
BEGIN
  SELECT COALESCE(s.max_base_documents, 1)
    INTO base_max
  FROM public.admin_settings s
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = NEW.id
  ) THEN
    INSERT INTO public.user_subscriptions (user_id, tier, max_documents)
    VALUES (NEW.id, 'base', COALESCE(base_max, 1));
  END IF;

  RETURN NEW;
END;
$$;

-- 5) Keep user_subscriptions.max_documents in sync with tier and admin_settings
CREATE OR REPLACE FUNCTION public.update_subscription_max_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  base_max integer := 1;
  pro_max integer := 5;
  ent_max integer := 20;
BEGIN
  SELECT 
    COALESCE(s.max_base_documents, base_max),
    COALESCE(s.max_pro_documents, pro_max),
    COALESCE(s.max_enterprise_documents, ent_max)
  INTO base_max, pro_max, ent_max
  FROM public.admin_settings s
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NEW.tier = 'pro' THEN
    NEW.max_documents = pro_max;
  ELSIF NEW.tier = 'enterprise' THEN
    NEW.max_documents = ent_max;
  ELSE
    NEW.max_documents = base_max;
  END IF;

  RETURN NEW;
END;
$$;