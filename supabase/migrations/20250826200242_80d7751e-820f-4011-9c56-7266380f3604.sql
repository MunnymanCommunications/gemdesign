-- Add payment_required setting to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN payment_required boolean NOT NULL DEFAULT true;

-- Update default pricing to the new amounts
UPDATE public.admin_settings 
SET 
  price_base_cents = 4995,  -- $49.95
  price_pro_cents = 9995    -- $99.95
WHERE id IN (SELECT id FROM admin_settings ORDER BY created_at DESC LIMIT 1);

-- If no settings exist, this will be handled by the application's default creation