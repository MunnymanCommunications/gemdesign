-- Create admin_settings table for global AI configuration
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  global_prompt TEXT NOT NULL DEFAULT 'You are a helpful AI assistant.',
  ai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  chat_completions_url TEXT,
  api_key_encrypted TEXT,
  max_base_documents INTEGER NOT NULL DEFAULT 1,
  max_pro_documents INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_settings (only authenticated users can view, admins can modify)
CREATE POLICY "Anyone can view admin settings" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update admin settings" ON public.admin_settings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert admin settings" ON public.admin_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create user_subscriptions table for user tiers
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'base' CHECK (tier IN ('base', 'pro')),
  max_documents INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Create user_documents table for file uploads
CREATE TABLE public.user_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_documents
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for user_documents
CREATE POLICY "Users can view their own documents" ON public.user_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own documents" ON public.user_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.user_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.user_documents FOR DELETE USING (auth.uid() = user_id);

-- Create chat_conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat_conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_conversations
CREATE POLICY "Users can view their own conversations" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own conversations" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversations" ON public.chat_conversations FOR DELETE USING (auth.uid() = user_id);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_messages
CREATE POLICY "Users can view messages from their conversations" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = chat_messages.conversation_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert messages to their conversations" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE id = chat_messages.conversation_id AND user_id = auth.uid()
  )
);

-- Create analytics_events table for tracking usage
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policy for analytics_events (users can only see their own events)
CREATE POLICY "Users can view their own analytics events" ON public.analytics_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events FOR INSERT WITH CHECK (true);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for documents
CREATE POLICY "Users can view their own documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents" ON storage.objects FOR UPDATE USING (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents" ON storage.objects FOR DELETE USING (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_documents_updated_at
  BEFORE UPDATE ON public.user_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically set max_documents based on subscription tier
CREATE OR REPLACE FUNCTION public.update_subscription_max_documents()
RETURNS TRIGGER AS $$
DECLARE
  base_max INTEGER;
  pro_max INTEGER;
BEGIN
  -- Get current max document limits from admin settings
  SELECT max_base_documents, max_pro_documents INTO base_max, pro_max
  FROM public.admin_settings
  LIMIT 1;
  
  -- Default values if no admin settings exist
  IF base_max IS NULL THEN base_max := 1; END IF;
  IF pro_max IS NULL THEN pro_max := 5; END IF;
  
  -- Set max_documents based on tier
  IF NEW.tier = 'base' THEN
    NEW.max_documents := base_max;
  ELSIF NEW.tier = 'pro' THEN
    NEW.max_documents := pro_max;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription max documents
CREATE TRIGGER update_subscription_max_documents_trigger
  BEFORE INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_max_documents();

-- Create function to automatically create user subscription on profile creation
CREATE OR REPLACE FUNCTION public.create_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, tier, max_documents)
  VALUES (NEW.id, 'base', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create subscription when profile is created
CREATE TRIGGER create_user_subscription_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_subscription();

-- Insert default admin settings
INSERT INTO public.admin_settings (global_prompt, ai_model, max_base_documents, max_pro_documents)
VALUES (
  'You are a helpful AI assistant for {{company_name}}. The user''s name is {{user_name}} and their email is {{user_email}}. Use their conversation history to provide personalized assistance: {{conversation_history}}',
  'gpt-4o-mini',
  1,
  5
);