-- Create chat AI integration function for document analysis
CREATE OR REPLACE FUNCTION public.get_user_documents_for_ai(user_uuid UUID)
RETURNS TABLE (
  filename TEXT,
  content_summary TEXT,
  file_path TEXT,
  mime_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ud.filename,
    'Document: ' || ud.filename || ' (Type: ' || ud.mime_type || ')' as content_summary,
    ud.file_path,
    ud.mime_type
  FROM user_documents ud
  WHERE ud.user_id = user_uuid
  ORDER BY ud.created_at DESC;
END;
$$;

-- Create function to get company information for AI invoice generation
CREATE OR REPLACE FUNCTION public.get_company_info_for_ai(user_uuid UUID)
RETURNS TABLE (
  company_name TEXT,
  business_info JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.company,
    jsonb_build_object(
      'email', p.email,
      'full_name', p.full_name,
      'company', p.company
    ) as business_info
  FROM profiles p
  WHERE p.id = user_uuid;
END;
$$;