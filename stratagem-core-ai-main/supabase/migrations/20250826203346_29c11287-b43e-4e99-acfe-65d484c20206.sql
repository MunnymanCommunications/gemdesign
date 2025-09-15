-- Create separate table for helpful worksheets (renamed from global_documents)
CREATE TABLE public.helpful_worksheets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create separate table for global AI documents that the AI references
CREATE TABLE public.global_ai_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  extracted_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.helpful_worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_ai_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for helpful worksheets (same as before for global_documents)
CREATE POLICY "Anyone can view helpful worksheets" 
ON public.helpful_worksheets 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert helpful worksheets" 
ON public.helpful_worksheets 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update helpful worksheets" 
ON public.helpful_worksheets 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete helpful worksheets" 
ON public.helpful_worksheets 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- RLS policies for global AI documents
CREATE POLICY "Anyone can view global AI documents" 
ON public.global_ai_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert global AI documents" 
ON public.global_ai_documents 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update global AI documents" 
ON public.global_ai_documents 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete global AI documents" 
ON public.global_ai_documents 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Migrate existing data from global_documents to helpful_worksheets
INSERT INTO public.helpful_worksheets (id, filename, file_path, file_size, mime_type, created_at, updated_at)
SELECT id, filename, file_path, file_size, mime_type, created_at, updated_at
FROM public.global_documents;

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_helpful_worksheets_updated_at
BEFORE UPDATE ON public.helpful_worksheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_ai_documents_updated_at
BEFORE UPDATE ON public.global_ai_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();