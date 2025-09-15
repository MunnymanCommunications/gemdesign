-- Add extracted_text column to user_documents table
ALTER TABLE public.user_documents 
ADD COLUMN extracted_text TEXT;

-- Add extracted_text column to global_documents table  
ALTER TABLE public.global_documents 
ADD COLUMN extracted_text TEXT;

-- Add index for better performance when searching extracted text
CREATE INDEX idx_user_documents_extracted_text ON public.user_documents USING gin(to_tsvector('english', extracted_text));
CREATE INDEX idx_global_documents_extracted_text ON public.global_documents USING gin(to_tsvector('english', extracted_text));