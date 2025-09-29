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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { documentId } = await req.json()
    const authHeader = req.headers.get('Authorization')!
    const supabaseAccessToken = authHeader.replace('Bearer ', '')

    // Verify user
    const { data: { user } } = await supabaseClient.auth.getUser(supabaseAccessToken)

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Get document to verify ownership
    const { data: document, error: fetchError } = await supabaseClient
      .from('user_documents')
      .select('id, file_path, user_id')
      .eq('id', documentId)
      .single()

    if (fetchError || !document || document.user_id !== user.id) {
      throw new Error('Document not found or unauthorized')
    }

    // Delete from storage
    if (document.file_path) {
      const { error: storageError } = await supabaseClient.storage
        .from('documents')
        .remove([document.file_path])

      if (storageError) throw storageError
    }

    // Delete from database
    const { error: dbError } = await supabaseClient
      .from('user_documents')
      .delete()
      .eq('id', documentId)

    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})