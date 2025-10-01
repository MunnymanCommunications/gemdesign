-- Enable RLS on chat tables if not already enabled
ALTER TABLE IF EXISTS public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_conversations
-- Users can view their own conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations" ON public.chat_conversations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own conversations
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.chat_conversations;
CREATE POLICY "Users can insert own conversations" ON public.chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
CREATE POLICY "Users can update own conversations" ON public.chat_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own conversations
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.chat_conversations;
CREATE POLICY "Users can delete own conversations" ON public.chat_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for chat_messages
-- Users can view messages in their own conversations
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
CREATE POLICY "Users can view own messages" ON public.chat_messages
  FOR SELECT USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations 
      WHERE id = chat_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

-- Users can insert messages into their own conversations
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
CREATE POLICY "Users can insert own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations 
      WHERE id = conversation_id 
      AND user_id = auth.uid()
    )
  );

-- Users can update their own messages
DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
CREATE POLICY "Users can update own messages" ON public.chat_messages
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations 
      WHERE id = conversation_id 
      AND user_id = auth.uid()
    )
  );

-- Users can delete their own messages
DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages" ON public.chat_messages
  FOR DELETE USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.chat_conversations 
      WHERE id = conversation_id 
      AND user_id = auth.uid()
    )
  );

-- For assessment_usage table (fix potential RLS issues)
ALTER TABLE IF EXISTS public.assessment_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
DROP POLICY IF EXISTS "Users can view own assessment usage" ON public.assessment_usage;
CREATE POLICY "Users can view own assessment usage" ON public.assessment_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own usage records
DROP POLICY IF EXISTS "Users can insert own assessment usage" ON public.assessment_usage;
CREATE POLICY "Users can insert own assessment usage" ON public.assessment_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);