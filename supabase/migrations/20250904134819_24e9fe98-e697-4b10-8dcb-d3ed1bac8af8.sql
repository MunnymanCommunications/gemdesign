-- Fix critical RLS policies for data security

-- 1. Fix login table RLS policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.login;

CREATE POLICY "Users can view their own login data" 
ON public.login 
FOR SELECT 
USING (auth.uid()::text = "Email"->>'user_id' OR auth.email() = "Email"->>'email');

CREATE POLICY "Users can insert their own login data" 
ON public.login 
FOR INSERT 
WITH CHECK (auth.uid()::text = "Email"->>'user_id' OR auth.email() = "Email"->>'email');

CREATE POLICY "Users can update their own login data" 
ON public.login 
FOR UPDATE 
USING (auth.uid()::text = "Email"->>'user_id' OR auth.email() = "Email"->>'email');

CREATE POLICY "Users can delete their own login data" 
ON public.login 
FOR DELETE 
USING (auth.uid()::text = "Email"->>'user_id' OR auth.email() = "Email"->>'email');

-- 2. Fix admin_settings table RLS policies  
DROP POLICY IF EXISTS "Anyone can view admin settings" ON public.admin_settings;

CREATE POLICY "Only admins can view admin settings" 
ON public.admin_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix subscribers table RLS policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

CREATE POLICY "Users can insert their own subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Users can update their own subscription" 
ON public.subscribers 
FOR UPDATE 
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Admins can manage all subscriptions" 
ON public.subscribers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));