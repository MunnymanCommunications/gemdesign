import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { document_id } = await req.json()

    if (!document_id) {
      throw new Error('document_id is required')
    }

    // Fetch the document to get storage details if any
    const { data: doc, error: fetchError } = await supabaseClient
      .from('helpful_documents')
      .select('*')
      .eq('id', document_id)
      .single()

    if (fetchError || !doc) {
      throw new Error('Document not found')
    }

    // Delete from storage if there's a file path
    if (doc.file_path) {
      const { error: storageError } = await supabaseClient.storage
        .from('helpful-documents') // Assuming bucket name; adjust if different
        .remove([doc.file_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Don't fail the whole operation if storage delete fails, but log it
      }
    }

    // Delete from database
    const { error: dbError } = await supabaseClient
      .from('helpful_documents')
      .delete()
      .eq('id', document_id)

    if (dbError) {
      throw dbError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document deleted successfully',
        deleted_id: document_id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Delete helpful document error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})