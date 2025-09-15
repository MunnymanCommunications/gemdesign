-- Add platform_prompt column to admin_settings table
ALTER TABLE public.admin_settings ADD COLUMN platform_prompt TEXT;