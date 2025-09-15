-- Ensure profile and subscription rows are created when a new auth user is inserted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_profile'
  ) THEN
    CREATE TRIGGER on_auth_user_created_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_subscription'
  ) THEN
    CREATE TRIGGER on_auth_user_created_subscription
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.create_user_subscription();
  END IF;
END $$;

-- Keep user_subscriptions.max_documents in sync with admin_settings on insert/update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_subscription_max_documents'
  ) THEN
    CREATE TRIGGER set_subscription_max_documents
      BEFORE INSERT OR UPDATE ON public.user_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.update_subscription_max_documents();
  END IF;
END $$;

-- Maintain updated_at automatically on updates to user_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'user_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER user_subscriptions_updated_at
      BEFORE UPDATE ON public.user_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;