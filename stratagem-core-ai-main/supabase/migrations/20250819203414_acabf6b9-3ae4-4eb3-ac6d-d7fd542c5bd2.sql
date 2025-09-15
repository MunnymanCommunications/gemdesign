-- Create a table for storing generated documents
CREATE TABLE public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('proposal', 'invoice')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  client_name TEXT NOT NULL,
  amount DECIMAL(10,2),
  file_path TEXT, -- For storing PDF file path in storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own generated documents" 
ON public.generated_documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated documents" 
ON public.generated_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated documents" 
ON public.generated_documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated documents" 
ON public.generated_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();