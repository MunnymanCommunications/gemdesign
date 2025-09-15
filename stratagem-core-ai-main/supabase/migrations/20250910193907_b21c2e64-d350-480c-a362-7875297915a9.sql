-- Add new columns to chat_conversations table for company assessments
ALTER TABLE public.chat_conversations 
ADD COLUMN company_name TEXT,
ADD COLUMN assessment_type TEXT DEFAULT 'general',
ADD COLUMN priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 1 AND priority_score <= 100),
ADD COLUMN priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high')),
ADD COLUMN conversation_summary TEXT,
ADD COLUMN assessment_data JSONB DEFAULT '{}';

-- Create an index for better search performance
CREATE INDEX idx_chat_conversations_company_search ON public.chat_conversations USING gin (to_tsvector('english', coalesce(company_name, '') || ' ' || coalesce(conversation_summary, '')));

-- Create index for priority sorting
CREATE INDEX idx_chat_conversations_priority ON public.chat_conversations (priority_score DESC, created_at DESC);