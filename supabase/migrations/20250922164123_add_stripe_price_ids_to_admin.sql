ALTER TABLE public.admin_settings
ADD COLUMN stripe_base_price_id TEXT,
ADD COLUMN stripe_pro_price_id TEXT;