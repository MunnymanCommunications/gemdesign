ALTER TABLE public.user_subscriptions
DROP COLUMN IF EXISTS payment_status;

ALTER TABLE public.user_subscriptions
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN status TEXT;

CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid');

ALTER TABLE public.user_subscriptions
ALTER COLUMN status TYPE subscription_status USING status::subscription_status;