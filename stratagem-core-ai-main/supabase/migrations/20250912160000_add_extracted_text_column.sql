-- Add extracted_text column to user_documents table
ALTER TABLE public.user_documents
ADD COLUMN extracted_text TEXT;

-- Create policy to allow users to read extracted text
CREATE POLICY "Users can view extracted text" 
ON public.user_documents 
FOR SELECT 
USING (auth.uid() = user_id);