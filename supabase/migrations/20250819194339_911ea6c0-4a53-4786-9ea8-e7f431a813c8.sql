-- Create storage bucket for generated PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-pdfs', 'generated-pdfs', false);

-- Create RLS policies for generated PDFs bucket
CREATE POLICY "Users can view their own generated PDFs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'generated-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own generated PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'generated-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own generated PDFs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'generated-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own generated PDFs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'generated-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add assistant ID fields to admin_settings
ALTER TABLE admin_settings 
ADD COLUMN general_assistant_id text,
ADD COLUMN platform_assistant_id text;