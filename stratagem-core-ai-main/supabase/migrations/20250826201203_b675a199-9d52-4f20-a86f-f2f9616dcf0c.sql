-- Add additional company fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN website text,
ADD COLUMN phone text,
ADD COLUMN address text,
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN zip_code text,
ADD COLUMN business_type text,
ADD COLUMN tax_id text;