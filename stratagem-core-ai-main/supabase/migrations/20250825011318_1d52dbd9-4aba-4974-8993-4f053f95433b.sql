-- Create user_themes table for personalized themes
CREATE TABLE public.user_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#8b5cf6',
  secondary_color TEXT NOT NULL DEFAULT '#a855f7',
  accent_color TEXT NOT NULL DEFAULT '#ec4899',
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  text_color TEXT NOT NULL DEFAULT '#1f2937',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;

-- Create policies for user themes
CREATE POLICY "Users can view their own themes" 
ON public.user_themes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own themes" 
ON public.user_themes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes" 
ON public.user_themes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own themes" 
ON public.user_themes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_themes_updated_at
BEFORE UPDATE ON public.user_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for user logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-logos', 'user-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for user logo uploads
CREATE POLICY "Users can view their own logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'user-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'user-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'user-logos' AND auth.uid()::text = (storage.foldername(name))[1]);