-- Create user_themes table
CREATE TABLE IF NOT EXISTS public.user_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#8b5cf6',
  secondary_color TEXT NOT NULL DEFAULT '#a855f7',
  accent_color TEXT NOT NULL DEFAULT '#ec4899',
  text_color TEXT NOT NULL DEFAULT '#1f2937',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to manage their own themes
CREATE POLICY "Users can view own theme" ON public.user_themes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own theme" ON public.user_themes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own theme" ON public.user_themes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own theme" ON public.user_themes
  FOR DELETE USING (auth.uid() = user_id);

-- Unique constraint to ensure one theme per user
CREATE UNIQUE INDEX IF NOT EXISTS user_themes_user_id_idx ON public.user_themes (user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_themes_updated_at BEFORE UPDATE
  ON public.user_themes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();