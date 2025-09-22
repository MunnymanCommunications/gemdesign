ALTER TABLE public.user_subscriptions
ADD COLUMN payment_status TEXT DEFAULT 'active';