-- Create global_documents table for admin-uploaded documents
CREATE TABLE public.global_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.global_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for global documents
CREATE POLICY "Anyone can view global documents" 
ON public.global_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert global documents" 
ON public.global_documents 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update global documents" 
ON public.global_documents 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete global documents" 
ON public.global_documents 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_global_documents_updated_at
BEFORE UPDATE ON public.global_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();